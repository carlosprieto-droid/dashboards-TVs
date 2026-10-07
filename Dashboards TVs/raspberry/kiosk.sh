#!/bin/bash
# Arranca el servidor local de los dashboards y un Chromium a pantalla completa por pantalla.
#   HDMI-A-1 (HDMI0, junto al USB-C) -> TV horizontal: dashboard.html
#   HDMI-A-2 (HDMI1)                 -> TV vertical:   termometros.html
DIR="$HOME/dashboard"

pgrep -f "dashboard/server.py" >/dev/null || (setsid nohup python3 "$DIR/server.py" >/dev/null 2>&1 &)

# Esperar a tener internet (los datos vienen del Google Sheet), máx. 60 s
for i in $(seq 60); do ping -c1 -W1 8.8.8.8 >/dev/null 2>&1 && break; sleep 1; done
sleep 2

FLAGS="--noerrdialogs --disable-infobars --no-first-run --password-store=basic
  --disable-session-crashed-bubble --disable-features=Translate,TranslateUI
  --autoplay-policy=no-user-gesture-required --check-for-update-interval=31536000
  --disable-pinch --overscroll-history-navigation=0 --ozone-platform=wayland --lang=es-ES"

launch() { # $1 = perfil, $2 = url
  local prof="$HOME/.kiosk/$1"
  mkdir -p "$prof"
  rm -f "$prof"/Singleton*
  rm -rf "$prof/Default/Cache" "$prof/Default/Code Cache"   # siempre la última versión de los dashboards
  # Sin aviso de traducción
  mkdir -p "$prof/Default"
  [ -f "$prof/Default/Preferences" ] || echo '{"translate":{"enabled":false},"intl":{"accept_languages":"es-ES,es"}}' > "$prof/Default/Preferences"
  python3 - "$prof/Default/Preferences" <<'PY'
import json, sys
p = sys.argv[1]
try: d = json.load(open(p))
except Exception: d = {}
d.setdefault("translate", {})["enabled"] = False
d.setdefault("intl", {})["accept_languages"] = "es-ES,es"
json.dump(d, open(p, "w"))
PY
  # Evita el aviso de "Chromium no se cerró correctamente" tras un apagón
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"Crashed"/"exit_type":"Normal"/' "$prof/Default/Preferences" 2>/dev/null
  chromium $FLAGS --user-data-dir="$prof" --app="$2" >/dev/null 2>&1 &
}

# Modo prueba (un solo monitor): si existe ~/dashboard/modo-prueba, alterna dashboard y termómetros girados
if [ -f "$DIR/modo-prueba" ]; then H=dashboard-prueba.html; else H=dashboard.html; fi
launch horizontal "http://127.0.0.1:8080/$H"
if wlr-randr | grep -q '^HDMI-A-2'; then
  sleep 4
  launch vertical "http://127.0.0.1:8080/termometros.html"
fi
