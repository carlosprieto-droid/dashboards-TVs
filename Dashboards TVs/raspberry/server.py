#!/usr/bin/env python3
"""Servidor de los dashboards + gestor de contenidos (puerto 8080).

- Sirve ~/dashboard/www (dashboards, gestor) sin caché.
- Sirve ~/dashboard/content/media (fotos y vídeos subidos), con soporte de Range para vídeo.
- API del gestor:
    GET  /api/slides                 pantallas (público en la red local, lo leen las teles)
    PUT  /api/slides                 guardar pantallas            (requiere sesión)
    GET/PUT /api/thermos             termómetros (igual que pantallas)
    POST /api/celebrate {kam,cliente,importe}  anunciar venta (requiere sesión)
    GET  /api/events?after=<id>      ventas anunciadas (las teles preguntan cada 3 s)
    GET/PUT /api/pipedrive           integración Pipedrive (token nunca se devuelve) (requiere sesión)
    GET  /api/pipedrive/pipelines|test
    POST /api/upload  (X-Filename)   subir foto/vídeo (cuerpo = fichero)  (requiere sesión)
    GET  /api/media                  listar medios                (requiere sesión)
    DELETE /api/media/<nombre>       borrar medio                 (requiere sesión)
    GET  /api/auth                   {configured, logged}
    POST /api/auth/setup {password}  crear contraseña (solo la primera vez)
    POST /api/auth/login {password}  iniciar sesión (cookie)
    POST /api/auth/logout
La contraseña se guarda como hash PBKDF2; nunca en claro.
"""
import hashlib, hmac, http.server, json, os, re, secrets, shutil, socket, threading, time, urllib.parse, urllib.request

HOME = os.environ.get("DASH_HOME", os.path.expanduser("~/dashboard"))
WWW = os.path.join(HOME, "www")
CONTENT = os.path.join(HOME, "content")
MEDIA = os.path.join(CONTENT, "media")
SLIDES = os.path.join(CONTENT, "slides.json")
THERMOS = os.path.join(CONTENT, "thermos.json")
EVENTS = os.path.join(CONTENT, "events.json")
CELEB = os.path.join(CONTENT, "celebration.json")   # sonido, duración y volumen de la celebración
PIPEDRIVE = os.path.join(CONTENT, "pipedrive.json")   # token + ajustes (solo en la Raspberry)
PD_API = os.environ.get("DASH_PD_API", "https://api.pipedrive.com/v1")
PD_EVERY = int(os.environ.get("DASH_PD_EVERY", "45"))  # segundos entre comprobaciones
AWTRIX = os.environ.get("DASH_AWTRIX", "http://192.168.1.85")  # reloj TC001 (aviso extra)
LISTS = {"/api/slides": SLIDES, "/api/thermos": THERMOS}
AUTH = os.path.join(CONTENT, "auth.json")
BIND = os.environ.get("DASH_BIND", "0.0.0.0")
PORT = int(os.environ.get("DASH_PORT", "8080"))
MAX_UPLOAD = 1024 * 1024 * 1024  # 1 GB
SESSION_DAYS = 30
os.makedirs(MEDIA, exist_ok=True)


def load_json(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def save_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


EV_LOCK = threading.Lock()


def add_event(kam, cliente, importe, origen, extra=None):
    """Registra una venta: las teles la celebran y el reloj TC001 avisa."""
    with EV_LOCK:
        evs = load_json(EVENTS, [])
        ev = {"id": max(int(time.time() * 1000), (evs[-1]["id"] + 1) if evs else 0), "kam": kam, "cliente": cliente,
              "importe": importe, "origen": origen, **(extra or {})}
        save_json(EVENTS, (evs + [ev])[-100:])
    threading.Thread(target=notify_awtrix, args=(ev,), daemon=True).start()
    return ev


# ---------------- Pipedrive ----------------
PD_LOCK = threading.Lock()
PD_STATUS = {"last_check": None, "last_error": None, "last_new": []}


def pd_get(token, path, params=None):
    q = urllib.parse.urlencode(params or {})
    req = urllib.request.Request(f"{PD_API}{path}{'?' + q if q else ''}", headers={"x-api-token": token, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        d = json.loads(r.read())
    if not d.get("success"):
        raise RuntimeError(d.get("error") or "Respuesta no válida de Pipedrive")
    return d.get("data") or []


def pd_public(cfg):
    """Ajustes sin el token (para el gestor)."""
    t = cfg.get("token") or ""
    return {"has_token": bool(t), "token_hint": t[-4:] if t else "", "enabled": bool(cfg.get("enabled")),
            "pipelines": cfg.get("pipelines", []), "min": cfg.get("min", 0), "client": cfg.get("client", "org"),
            "since": cfg.get("since"), "status": PD_STATUS}


def pd_deal_event(cfg, deal):
    """Convierte un deal ganado en venta si pasa los filtros; None si no."""
    if cfg.get("pipelines") and deal.get("pipeline_id") not in cfg["pipelines"]:
        return None
    value = float(deal.get("value") or 0)
    if value < float(cfg.get("min") or 0) or value <= 0:
        return None
    user = deal.get("user_id") or {}
    kam = (user.get("name") if isinstance(user, dict) else None) or deal.get("owner_name") or "Equipo"
    org = deal.get("org_id") or {}
    org_name = (org.get("name") if isinstance(org, dict) else None) or deal.get("org_name")
    cliente = deal.get("title") if cfg.get("client") == "title" else (org_name or deal.get("title") or "")
    return kam.split(" ")[0] if kam else kam, cliente or "", value


def pd_check():
    with PD_LOCK:
        cfg = load_json(PIPEDRIVE, {})
        if not cfg.get("enabled") or not cfg.get("token"):
            return
        PD_STATUS["last_check"] = time.strftime("%Y-%m-%d %H:%M:%S")
        try:
            deals = pd_get(cfg["token"], "/deals", {"status": "won", "sort": "won_time DESC", "limit": 50})
        except Exception as e:  # sin conexión, token revocado…
            PD_STATUS["last_error"] = str(e)[:200]
            return
        PD_STATUS["last_error"] = None
        since, seen = cfg.get("since") or "", set(cfg.get("seen", []))
        new = []
        for d in sorted(deals, key=lambda x: x.get("won_time") or ""):
            if not d.get("won_time") or d["won_time"] <= since or d.get("id") in seen:
                continue
            seen.add(d.get("id"))
            r = pd_deal_event(cfg, d)
            if r:
                kam, cliente, value = r
                add_event(kam, cliente, value, "pipedrive", {"deal": d.get("id")})
                new.append(f"{kam} · {cliente} · {value:.0f}")
        if new:
            PD_STATUS["last_new"] = (new + PD_STATUS["last_new"])[:5]
        cfg["seen"] = list(seen)[-500:]
        save_json(PIPEDRIVE, cfg)


def pd_loop():
    while True:
        try:
            pd_check()
        except Exception as e:
            PD_STATUS["last_error"] = str(e)[:200]
        time.sleep(PD_EVERY)


def notify_awtrix(ev):
    """Aviso en el reloj TC001: texto parpadeando + ráfaga por el zumbador (si está accesible)."""
    imp = ev["importe"]
    txt = f"+{imp / 1000:.1f}k {ev['kam']}".replace(".", ",") if imp >= 1000 else f"+{imp:.0f} {ev['kam']}"
    body = json.dumps({"text": txt, "textColor": "#00D040", "textBlinkMs": 200, "durationMs": 10000,
                       "soundRtttl": "rafaga:d=32,o=7,b=300:c,a6,f6,c,a6,f6,c,a6,f6,c,a6,f6,c,a6,f6,c,a6,f6"}).encode()
    try:
        req = urllib.request.Request(AWTRIX + "/api/v1/notifications", data=body, headers={"Content-Type": "application/json"}, method="POST")
        urllib.request.urlopen(req, timeout=4).read()
    except Exception:
        pass


def hash_pw(pw, salt):
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=WWW, **kw)

    def log_message(self, *a):
        pass

    def guess_type(self, path):
        t = super().guess_type(path)
        return t + "; charset=utf-8" if t in ("text/html", "text/javascript", "application/javascript", "text/css", "text/markdown") else t

    def end_headers(self):
        if not self.path.startswith("/media/"):
            self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    # ---------- utilidades ----------
    def send_json(self, code, data, headers=None):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def body_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 5 * 1024 * 1024:
            return None
        try:
            return json.loads(self.rfile.read(n) or b"null")
        except ValueError:
            return None

    def session_ok(self):
        auth = load_json(AUTH, {})
        m = re.search(r"cms=([A-Za-z0-9_-]+)", self.headers.get("Cookie", ""))
        if not m:
            return False
        exp = auth.get("sessions", {}).get(m.group(1))
        return bool(exp and exp > time.time())

    def need_session(self):
        if self.session_ok():
            return True
        self.send_json(401, {"error": "login"})
        return False

    # ---------- GET ----------
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path in LISTS:
            return self.send_json(200, load_json(LISTS[path], []))
        if path == "/api/celebration":
            return self.send_json(200, {"sound": "", "hold": 20, "volume": 1, **load_json(CELEB, {})})
        if path == "/api/events":
            # Ventas anunciadas. ?after=<id> devuelve las posteriores; sin after, solo el último id.
            evs = load_json(EVENTS, [])
            last = evs[-1]["id"] if evs else 0
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("after", [""])[0]
            after = int(q) if q.isdigit() else None
            return self.send_json(200, {"last": last, "events": [e for e in evs if after is not None and e["id"] > after]})
        if path == "/api/pipedrive":
            if not self.need_session():
                return
            return self.send_json(200, pd_public(load_json(PIPEDRIVE, {})))
        if path == "/api/pipedrive/pipelines":
            if not self.need_session():
                return
            cfg = load_json(PIPEDRIVE, {})
            if not cfg.get("token"):
                return self.send_json(400, {"error": "Primero guarda el token"})
            try:
                return self.send_json(200, [{"id": p["id"], "name": p["name"]} for p in pd_get(cfg["token"], "/pipelines")])
            except Exception as e:
                return self.send_json(502, {"error": "Pipedrive: " + str(e)[:150]})
        if path == "/api/pipedrive/test":
            if not self.need_session():
                return
            cfg = load_json(PIPEDRIVE, {})
            if not cfg.get("token"):
                return self.send_json(400, {"error": "Primero guarda el token"})
            try:
                deals = pd_get(cfg["token"], "/deals", {"status": "won", "sort": "won_time DESC", "limit": 5})
            except Exception as e:
                return self.send_json(502, {"error": "Pipedrive: " + str(e)[:150]})
            out = []
            for d in deals:
                r = pd_deal_event({**cfg, "pipelines": cfg.get("pipelines", []), "min": cfg.get("min", 0)}, d)
                out.append({"won_time": d.get("won_time"), "title": d.get("title"), "value": d.get("value"), "currency": d.get("currency"),
                            "kam": r[0] if r else None, "cliente": r[1] if r else None, "pasa_filtros": bool(r)})
            return self.send_json(200, out)
        if path == "/api/auth":
            return self.send_json(200, {"configured": "hash" in load_json(AUTH, {}), "logged": self.session_ok()})
        if path == "/api/media":
            if not self.need_session():
                return
            items = []
            for n in sorted(os.listdir(MEDIA), reverse=True):
                p = os.path.join(MEDIA, n)
                if os.path.isfile(p):
                    items.append({"name": n, "url": "/media/" + n, "size": os.path.getsize(p)})
            return self.send_json(200, items)
        if path.startswith("/media/"):
            return self.serve_media(urllib.parse.unquote(path[len("/media/"):]))
        if path in ("/", ""):
            self.send_response(302)
            self.send_header("Location", "/admin.html")
            self.end_headers()
            return
        return super().do_GET()

    def serve_media(self, name):
        if "/" in name or name.startswith("."):
            return self.send_error(404)
        p = os.path.join(MEDIA, name)
        if not os.path.isfile(p):
            return self.send_error(404)
        size = os.path.getsize(p)
        ctype = self.guess_type(p)
        start, end = 0, size - 1
        rng = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
        if rng:
            if rng.group(1):
                start = int(rng.group(1))
                if rng.group(2):
                    end = min(int(rng.group(2)), size - 1)
            elif rng.group(2):
                start = max(0, size - int(rng.group(2)))
            if start > end:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.end_headers()
                return
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Cache-Control", "max-age=86400")
        self.end_headers()
        with open(p, "rb") as f:
            f.seek(start)
            left = end - start + 1
            try:
                while left > 0:
                    chunk = f.read(min(1 << 16, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass

    # ---------- POST / PUT / DELETE ----------
    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/auth/setup":
            auth = load_json(AUTH, {})
            if "hash" in auth:
                return self.send_json(409, {"error": "Ya hay contraseña"})
            data = self.body_json() or {}
            pw = str(data.get("password", ""))
            if len(pw) < 8:
                return self.send_json(400, {"error": "Mínimo 8 caracteres"})
            salt = secrets.token_hex(16)
            auth = {"salt": salt, "hash": hash_pw(pw, salt), "sessions": {}}
            return self.start_session(auth)
        if path == "/api/auth/login":
            auth = load_json(AUTH, {})
            data = self.body_json() or {}
            if "hash" not in auth or not hmac.compare_digest(auth["hash"], hash_pw(str(data.get("password", "")), auth["salt"])):
                time.sleep(1)
                return self.send_json(401, {"error": "Contraseña incorrecta"})
            return self.start_session(auth)
        if path == "/api/auth/logout":
            auth = load_json(AUTH, {})
            m = re.search(r"cms=([A-Za-z0-9_-]+)", self.headers.get("Cookie", ""))
            if m:
                auth.get("sessions", {}).pop(m.group(1), None)
                save_json(AUTH, auth)
            return self.send_json(200, {"ok": True}, {"Set-Cookie": "cms=; Path=/; Max-Age=0"})
        if path == "/api/celebrate":
            if not self.need_session():
                return
            d = self.body_json() or {}
            kam = str(d.get("kam", "")).strip()[:60]
            cliente = str(d.get("cliente", "")).strip()[:80]
            try:
                importe = float(d.get("importe") or 0)
            except (TypeError, ValueError):
                importe = 0
            if not kam or importe <= 0:
                return self.send_json(400, {"error": "Indica el KAM y un importe mayor que 0"})
            return self.send_json(200, add_event(kam, cliente, importe, "manual"))
        if path == "/api/upload":
            if not self.need_session():
                return
            n = int(self.headers.get("Content-Length") or 0)
            if n <= 0 or n > MAX_UPLOAD:
                return self.send_json(413, {"error": "Archivo vacío o mayor de 1 GB"})
            raw = urllib.parse.unquote(self.headers.get("X-Filename", "archivo"))
            base, ext = os.path.splitext(os.path.basename(raw))
            ext = ext.lower()
            if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov", ".m4v", ".mp3", ".wav", ".ogg", ".m4a"):
                return self.send_json(415, {"error": "Formato no admitido"})
            safe = re.sub(r"[^A-Za-z0-9_-]+", "-", base).strip("-")[:40] or "archivo"
            name = f"{time.strftime('%Y%m%d-%H%M%S')}-{safe}{ext}"
            tmp = os.path.join(MEDIA, "." + name + ".part")
            with open(tmp, "wb") as f:
                left = n
                while left > 0:
                    chunk = self.rfile.read(min(1 << 20, left))
                    if not chunk:
                        break
                    f.write(chunk)
                    left -= len(chunk)
            if left:
                os.remove(tmp)
                return self.send_json(400, {"error": "Subida incompleta"})
            os.replace(tmp, os.path.join(MEDIA, name))
            return self.send_json(200, {"name": name, "url": "/media/" + name})
        return self.send_json(404, {"error": "No encontrado"})

    def start_session(self, auth):
        token = secrets.token_urlsafe(32)
        now = time.time()
        sessions = {k: v for k, v in auth.get("sessions", {}).items() if v > now}
        sessions[token] = now + SESSION_DAYS * 86400
        auth["sessions"] = sessions
        save_json(AUTH, auth)
        return self.send_json(200, {"ok": True}, {"Set-Cookie": f"cms={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={SESSION_DAYS * 86400}"})

    def do_PUT(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/celebration":
            if not self.need_session():
                return
            d = self.body_json() or {}
            cfg = load_json(CELEB, {})
            if "sound" in d:
                snd = str(d["sound"] or "")
                cfg["sound"] = snd if snd == "" or re.fullmatch(r"/media/[A-Za-z0-9._-]+", snd) else cfg.get("sound", "")
            if "hold" in d:
                try: cfg["hold"] = min(120, max(5, int(d["hold"])))
                except (TypeError, ValueError): pass
            if "volume" in d:
                try: cfg["volume"] = min(1.0, max(0.0, float(d["volume"])))
                except (TypeError, ValueError): pass
            save_json(CELEB, cfg)
            return self.send_json(200, {"sound": "", "hold": 20, "volume": 1, **cfg})
        if path == "/api/pipedrive":
            if not self.need_session():
                return
            d = self.body_json() or {}
            cfg = load_json(PIPEDRIVE, {})
            if isinstance(d.get("token"), str) and d["token"].strip():
                cfg["token"] = d["token"].strip()
            if d.get("remove_token"):
                cfg.pop("token", None); cfg["enabled"] = False
            if "enabled" in d:
                en = bool(d["enabled"]) and bool(cfg.get("token"))
                if en and not cfg.get("enabled"):
                    # Al activar: solo cuentan los deals ganados a partir de ahora (hora UTC, como Pipedrive)
                    cfg["since"] = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
                cfg["enabled"] = en
            if isinstance(d.get("pipelines"), list):
                cfg["pipelines"] = [int(x) for x in d["pipelines"] if str(x).isdigit()]
            if "min" in d:
                try:
                    cfg["min"] = max(0.0, float(d["min"] or 0))
                except (TypeError, ValueError):
                    pass
            if d.get("client") in ("org", "title"):
                cfg["client"] = d["client"]
            save_json(PIPEDRIVE, cfg)
            try:
                os.chmod(PIPEDRIVE, 0o600)
            except OSError:
                pass
            return self.send_json(200, pd_public(cfg))
        if path not in LISTS:
            return self.send_json(404, {"error": "No encontrado"})
        if not self.need_session():
            return
        data = self.body_json()
        if not isinstance(data, list):
            return self.send_json(400, {"error": "Formato no válido"})
        target = LISTS[path]
        if os.path.exists(target):
            shutil.copy(target, target + ".bak")
        save_json(target, data)
        return self.send_json(200, {"ok": True, "count": len(data)})

    def do_DELETE(self):
        path = urllib.parse.urlparse(self.path).path
        if not path.startswith("/api/media/"):
            return self.send_json(404, {"error": "No encontrado"})
        if not self.need_session():
            return
        name = urllib.parse.unquote(path[len("/api/media/"):])
        p = os.path.join(MEDIA, name)
        if "/" in name or name.startswith(".") or not os.path.isfile(p):
            return self.send_json(404, {"error": "No encontrado"})
        os.remove(p)
        return self.send_json(200, {"ok": True})


class DualStackServer(http.server.ThreadingHTTPServer):
    """Escucha en IPv4 e IPv6: Chrome resuelve dashboard.local primero por IPv6."""
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


if __name__ == "__main__":
    threading.Thread(target=pd_loop, daemon=True).start()
    if BIND == "0.0.0.0":
        DualStackServer(("::", PORT), Handler).serve_forever()
    else:
        http.server.ThreadingHTTPServer((BIND, PORT), Handler).serve_forever()
