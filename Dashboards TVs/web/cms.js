// Plantillas de contenido (noticias, anuncios, personas, vídeos…) con la identidad Gelt.
// Lo usan dashboard.html, termometros.html y el gestor (admin.html).
// Las medidas usan unidades de contenedor (cqw/cqh), así cada plantilla escala igual en la TV,
// en la tele vertical y en la vista previa del gestor.
window.CMS = (() => {
  const T = (k, l, t, extra = {}) => ({ k, l, t, ...extra });
  const TEMPLATES = {
    noticia: {
      name: "Noticia", desc: "Foto o vídeo + titular + texto",
      fields: [T("etiqueta", "Etiqueta", "text", { def: "Noticias" }), T("titulo", "Titular", "text"), T("texto", "Texto", "textarea"),
               T("media", "Foto o vídeo", "media"), T("pie", "Pie (fecha, autor…)", "text")],
      sample: { etiqueta: "Noticias", titulo: "Shotback supera los 70.000 usuarios", texto: "En solo seis meses hemos recibido más de **100.000 tickets** de bares y restaurantes de toda España.\n\nGracias a todo el equipo por el empujón final.", pie: "1 de octubre · Equipo Producto" }
    },
    anuncio: {
      name: "Anuncio", desc: "Imagen o vídeo de fondo a pantalla completa",
      fields: [T("etiqueta", "Etiqueta", "text", { def: "Anuncio" }), T("titulo", "Titular", "text"), T("subtitulo", "Subtítulo", "textarea"),
               T("media", "Fondo (foto o vídeo)", "media"), T("cta", "Botón / llamada a la acción", "text")],
      sample: { etiqueta: "Evento", titulo: "Afterwork de otoño", subtitulo: "Jueves 9 de octubre · 19:00 · Terraza Gelt", cta: "Apúntate en #general" }
    },
    persona: {
      name: "Persona", desc: "Bienvenidas, cumpleaños, empleado del mes",
      fields: [T("etiqueta", "Etiqueta", "text", { def: "Bienvenida" }), T("media", "Foto", "media"), T("nombre", "Nombre", "text"),
               T("cargo", "Cargo / equipo", "text"), T("texto", "Texto o cita", "textarea")],
      sample: { etiqueta: "Bienvenida", nombre: "Lucía Martín", cargo: "Key Account Manager · B2B", texto: "Viene de 5 años en gran consumo. ¡Dale la bienvenida cuando la veas por la oficina!" }
    },
    cifra: {
      name: "Cifra / hito", desc: "Un número grande para celebrar un logro",
      fields: [T("etiqueta", "Etiqueta", "text", { def: "Hito" }), T("cifra", "Cifra", "text"), T("titulo", "Qué significa", "text"),
               T("texto", "Detalle", "textarea"), T("media", "Fondo opcional", "media")],
      sample: { etiqueta: "Hito", cifra: "+102.000", titulo: "tickets recibidos en Shotback", texto: "Objetivo 2026: 500.000 usuarios" }
    },
    video: {
      name: "Vídeo", desc: "Un vídeo a pantalla completa con título opcional",
      fields: [T("media", "Vídeo", "media"), T("titulo", "Título (opcional)", "text"), T("sonido", "Con sonido", "bool", { def: false })],
      sample: { titulo: "Así fue la activación Mahou Reserva" }
    },
    galeria: {
      name: "Galería", desc: "Hasta 6 fotos (eventos, equipo, activaciones)",
      fields: [T("etiqueta", "Etiqueta", "text", { def: "Galería" }), T("titulo", "Título", "text"), T("fotos", "Fotos (hasta 6)", "gallery")],
      sample: { etiqueta: "Galería", titulo: "Activaciones de septiembre" }
    },
    comunicado: {
      name: "Comunicado", desc: "Texto largo: avisos, políticas, mensajes de dirección",
      fields: [T("etiqueta", "Etiqueta", "text", { def: "Comunicado" }), T("titulo", "Título", "text"), T("texto", "Texto", "textarea"), T("firma", "Firma", "text")],
      sample: { etiqueta: "Comunicado", titulo: "Nuevo horario de verano", texto: "A partir del lunes, la oficina abre de **8:00 a 15:00** de lunes a jueves.\n\nLos viernes seguimos con jornada intensiva.", firma: "Dirección" }
    }
  };

  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // **negrita** y saltos de línea; párrafos con línea en blanco
  const rich = s => esc(s).split(/\n\s*\n/).map(p => `<p>${p.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>")}</p>`).join("");
  const isVideo = u => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u || "");
  function media(u, cls = "", opts = {}) {
    if (!u) return `<div class="cms-ph ${cls}"><span>${opts.ph || "Sin foto"}</span></div>`;
    if (isVideo(u)) return `<video class="${cls}" src="${esc(u)}" ${opts.sound ? "" : "muted"} playsinline ${opts.loop === false ? "" : "loop"} preload="auto" data-cms-video="${opts.main ? "main" : "bg"}"></video>`;
    return `<img class="${cls}" src="${esc(u)}" alt="">`;
  }
  const tag = t => t ? `<span class="cms-tag">${esc(t)}</span>` : "";

  function render(slide) {
    const f = slide.fields || {}, tpl = slide.template;
    switch (tpl) {
      case "noticia": return `<div class="cms cms-noticia">
          <div class="cms-card cms-media-box cms-in">${media(f.media, "cms-fill")}</div>
          <div class="cms-body cms-in d1">${tag(f.etiqueta)}<h1>${esc(f.titulo)}</h1><div class="cms-text">${rich(f.texto)}</div>${f.pie ? `<div class="cms-foot">${esc(f.pie)}</div>` : ""}</div>
        </div>`;
      case "anuncio": return `<div class="cms cms-anuncio">
          <div class="cms-bg">${media(f.media, "cms-fill kb", { ph: "Fondo" })}</div><div class="cms-shade"></div>
          <div class="cms-body cms-in">${tag(f.etiqueta)}<h1>${esc(f.titulo)}</h1>${f.subtitulo ? `<div class="cms-sub">${rich(f.subtitulo)}</div>` : ""}${f.cta ? `<span class="cms-cta">${esc(f.cta)}</span>` : ""}</div>
        </div>`;
      case "persona": return `<div class="cms cms-persona">
          <div class="cms-avatar cms-in"><div class="cms-ring"></div>${media(f.media, "cms-fill", { ph: "Foto" })}</div>
          <div class="cms-body cms-in d1">${tag(f.etiqueta)}<h1>${esc(f.nombre)}</h1>${f.cargo ? `<div class="cms-role">${esc(f.cargo)}</div>` : ""}${f.texto ? `<div class="cms-quote">${rich(f.texto)}</div>` : ""}</div>
        </div>`;
      case "cifra": return `<div class="cms cms-cifra">
          ${f.media ? `<div class="cms-bg dim">${media(f.media, "cms-fill kb")}</div><div class="cms-shade center"></div>` : ""}
          <div class="cms-body cms-in">${tag(f.etiqueta)}<div class="cms-big">${esc(f.cifra)}</div><h1>${esc(f.titulo)}</h1>${f.texto ? `<div class="cms-text">${rich(f.texto)}</div>` : ""}</div>
        </div>`;
      case "video": return `<div class="cms cms-video">
          <div class="cms-card cms-media-box cms-in">${media(f.media, "cms-fill", { main: true, sound: !!f.sonido, loop: false, ph: "Vídeo" })}</div>
          ${f.titulo ? `<div class="cms-caption cms-in d1">${esc(f.titulo)}</div>` : ""}
        </div>`;
      case "galeria": {
        const fotos = (f.fotos || []).slice(0, 6);
        return `<div class="cms cms-galeria">
          <div class="cms-head cms-in">${tag(f.etiqueta)}<h1>${esc(f.titulo)}</h1></div>
          <div class="cms-grid n${Math.max(1, fotos.length)}">${(fotos.length ? fotos : [""]).map((u, i) => `<div class="cms-card cms-media-box cms-in d${Math.min(i + 1, 6)}">${media(u, "cms-fill kb")}</div>`).join("")}</div>
        </div>`;
      }
      case "comunicado": return `<div class="cms cms-comunicado">
          <div class="cms-card cms-paper cms-in">${tag(f.etiqueta)}<h1>${esc(f.titulo)}</h1><div class="cms-text">${rich(f.texto)}</div>${f.firma ? `<div class="cms-foot">— ${esc(f.firma)}</div>` : ""}</div>
        </div>`;
    }
    return `<div class="cms"><div class="cms-body"><h1>Plantilla desconocida</h1></div></div>`;
  }

  // Pantallas activas para una tele ("h" horizontal, "v" vertical) en este momento
  function active(list, screen, now = new Date()) {
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;  // fecha local
    return (list || []).filter(s => s.active !== false
      && (s.screens || "h") !== (screen === "h" ? "v" : "h")
      && (!s.from || s.from <= day) && (!s.to || s.to >= day));
  }

  // Control de vídeos al entrar/salir de pantalla
  function onShow(el) {
    el.querySelectorAll("video").forEach(v => { try { v.currentTime = 0; } catch (e) {} const p = v.play(); if (p) p.catch(() => { v.muted = true; v.play().catch(() => {}); }); });
  }
  function onHide(el) { el.querySelectorAll("video").forEach(v => v.pause()); }
  // Duración en ms: la de la pantalla; un vídeo principal con duración 0 dura lo que el vídeo
  function waitsForVideo(slide) { return slide.template === "video" && !(+slide.dur > 0); }

  const CSS = `
  .cms-stage { position: relative; flex: 1; min-height: 0; container-type: size; }
  .cms { position: absolute; inset: 0; color: #fff; font-family: Lato, system-ui, sans-serif; font-size: 1cqw; }
  @container (aspect-ratio < 1) { .cms { font-size: 1.75cqw; } }
  .cms h1 { font-family: Montserrat, sans-serif; font-weight: 800; line-height: 1.08; letter-spacing: -.01em; margin: 0; }
  .cms p { margin: 0 0 .7em; } .cms strong { color: #5DD5DC; font-weight: 700; }
  .cms-tag { align-self: flex-start; display: inline-block; font-family: Montserrat, sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
             font-size: 1.25em; padding: .35em .9em; border-radius: .35em; background: #FF344C; color: #fff; box-shadow: 0 0 1.2em rgba(255,52,76,.45); }
  .cms-card { position: relative; border-radius: 1.1em; overflow: hidden; background: linear-gradient(180deg, rgba(6,59,93,.62), rgba(6,59,93,.28));
              border: 1px solid rgba(26,184,196,.18); box-shadow: 0 1.2em 3em rgba(0,0,0,.3); }
  .cms-card::before, .cms-card::after { content: ""; position: absolute; width: 1.6em; height: 1.6em; z-index: 2; pointer-events: none; }
  .cms-card::before { top: 0; left: 0; border-top: 2px solid #1AB8C4; border-left: 2px solid #1AB8C4; border-top-left-radius: 1.1em; }
  .cms-card::after { bottom: 0; right: 0; border-bottom: 2px solid #FF344C; border-right: 2px solid #FF344C; border-bottom-right-radius: 1.1em; }
  .cms-fill { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cms-ph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #8FA7B5; font-size: 1.6em;
            background: repeating-linear-gradient(135deg, rgba(26,184,196,.08) 0 1em, rgba(26,184,196,.02) 1em 2em); }
  .cms-body { display: flex; flex-direction: column; gap: 1.2em; }
  .cms-text { font-size: 1.55em; line-height: 1.5; color: #D6D6D6; }
  .cms-foot { font-size: 1.2em; color: #8FA7B5; text-transform: uppercase; letter-spacing: .08em; font-family: Montserrat, sans-serif; font-weight: 600; }

  /* Noticia */
  .cms-noticia { display: grid; grid-template-columns: 1.15fr 1fr; gap: 3em; align-items: center; }
  .cms-noticia .cms-media-box { height: 100%; }
  .cms-noticia h1 { font-size: 3.6em; }
  @container (aspect-ratio < 1) { .cms-noticia { grid-template-columns: 1fr; grid-template-rows: 46% 1fr; align-items: start; } .cms-noticia h1 { font-size: 3.4em; } }

  /* Anuncio */
  .cms-anuncio, .cms-cifra { border-radius: 1.1em; overflow: hidden; }
  .cms-bg { position: absolute; inset: 0; } .cms-bg.dim { opacity: .45; }
  .cms-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(15,34,53,.95) 0%, rgba(15,34,53,.75) 40%, rgba(15,34,53,.05) 75%); }
  .cms-shade.center { background: radial-gradient(circle at center, rgba(15,34,53,.55), rgba(15,34,53,.95)); }
  .cms-anuncio .cms-body { position: absolute; left: 5%; bottom: 10%; width: 58%; }
  .cms-anuncio h1 { font-size: 6em; text-shadow: 0 0 .5em rgba(0,0,0,.4); }
  .cms-sub { font-size: 2em; color: #D6D6D6; line-height: 1.4; }
  .cms-cta { align-self: flex-start; font-family: Montserrat, sans-serif; font-weight: 800; font-size: 1.6em; padding: .6em 1.3em; border-radius: 3em;
             background: #1AB8C4; color: #0F2235; box-shadow: 0 0 1.5em rgba(26,184,196,.7); }
  @container (aspect-ratio < 1) { .cms-shade { background: linear-gradient(0deg, rgba(15,34,53,.97) 0%, rgba(15,34,53,.7) 45%, rgba(15,34,53,.05) 80%); }
    .cms-anuncio .cms-body { width: 88%; bottom: 6%; } .cms-anuncio h1 { font-size: 5em; } }

  /* Persona */
  .cms-persona { display: grid; grid-template-columns: auto 1fr; gap: 5em; align-items: center; padding: 0 4%; }
  .cms-avatar { position: relative; width: 26em; height: 26em; border-radius: 50%; }
  .cms-avatar .cms-fill, .cms-avatar .cms-ph { border-radius: 50%; top: 1.1em; left: 1.1em; width: calc(100% - 2.2em); height: calc(100% - 2.2em); }
  .cms-ring { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(#1AB8C4, #5DD5DC, #FF344C, #1AB8C4);
              filter: drop-shadow(0 0 1.2em rgba(26,184,196,.6)); animation: cmsSpin 12s linear infinite; }
  .cms-ring::after { content: ""; position: absolute; inset: .6em; border-radius: 50%; background: #0F2235; }
  .cms-persona h1 { font-size: 5.2em; }
  .cms-role { font-family: Montserrat, sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #1AB8C4; font-size: 1.6em; }
  .cms-quote { font-size: 1.8em; line-height: 1.5; color: #D6D6D6; border-left: .2em solid #FF344C; padding-left: 1em; max-width: 34em; }
  @container (aspect-ratio < 1) { .cms-persona { grid-template-columns: 1fr; justify-items: center; text-align: center; gap: 3em; align-content: center; }
    .cms-persona .cms-body { align-items: center; } .cms-persona .cms-tag { align-self: center; } .cms-quote { border-left: 0; padding-left: 0; } }

  /* Cifra */
  .cms-cifra .cms-body { position: absolute; inset: 0; align-items: center; justify-content: center; text-align: center; }
  .cms-cifra .cms-tag { align-self: center; }
  .cms-big { font-family: Montserrat, sans-serif; font-weight: 900; font-size: 13em; line-height: 1; letter-spacing: -.03em;
             background: linear-gradient(180deg, #fff 10%, #5DD5DC 60%, #1AB8C4); -webkit-background-clip: text; background-clip: text; color: transparent;
             filter: drop-shadow(0 0 .25em rgba(26,184,196,.55)); }
  .cms-cifra h1 { font-size: 3.6em; } .cms-cifra .cms-text { max-width: 50em; }
  @container (aspect-ratio < 1) { .cms-big { font-size: 9em; } }

  /* Vídeo */
  .cms-video .cms-media-box { position: absolute; inset: 0; }
  .cms-video video.cms-fill { object-fit: contain; background: #000; }
  .cms-caption { position: absolute; left: 3%; bottom: 5%; font-family: Montserrat, sans-serif; font-weight: 800; font-size: 2.4em; padding: .5em 1em;
                 border-radius: .4em; background: rgba(15,34,53,.82); border-left: .2em solid #FF344C; }

  /* Galería */
  .cms-galeria { display: flex; flex-direction: column; gap: 2em; }
  .cms-head { display: flex; align-items: center; gap: 1.5em; } .cms-galeria h1 { font-size: 3.2em; }
  .cms-grid { flex: 1; min-height: 0; display: grid; gap: 1.5em; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 1fr; }
  .cms-grid.n1 { grid-template-columns: 1fr; } .cms-grid.n2, .cms-grid.n4 { grid-template-columns: repeat(2, 1fr); }
  .cms-grid .cms-media-box { min-height: 0; }
  @container (aspect-ratio < 1) { .cms-grid, .cms-grid.n3, .cms-grid.n5, .cms-grid.n6 { grid-template-columns: repeat(2, 1fr); } .cms-grid.n1, .cms-grid.n2, .cms-grid.n3 { grid-template-columns: 1fr; } .cms-head { flex-direction: column; align-items: flex-start; } }

  /* Comunicado */
  .cms-comunicado { display: flex; align-items: center; justify-content: center; }
  .cms-paper { width: 72%; max-height: 100%; padding: 4em 5em; display: flex; flex-direction: column; gap: 1.6em; }
  .cms-paper h1 { font-size: 4em; } .cms-paper .cms-text { font-size: 1.9em; }
  @container (aspect-ratio < 1) { .cms-paper { width: 100%; padding: 3em; } }

  /* Animaciones de entrada (se lanzan cuando la pantalla aparece) */
  .cms-in { opacity: 0; transform: translateY(2em); }
  .on .cms-in, .cms-preview .cms-in { animation: cmsIn .9s cubic-bezier(.2,.8,.2,1) forwards; }
  .on .cms-in.d1 { animation-delay: .15s; } .on .cms-in.d2 { animation-delay: .25s; } .on .cms-in.d3 { animation-delay: .35s; }
  .on .cms-in.d4 { animation-delay: .45s; } .on .cms-in.d5 { animation-delay: .55s; } .on .cms-in.d6 { animation-delay: .65s; }
  .kb { animation: cmsKb 24s ease-in-out infinite alternate; }
  @keyframes cmsIn { to { opacity: 1; transform: none; } }
  @keyframes cmsKb { from { transform: scale(1); } to { transform: scale(1.08); } }
  @keyframes cmsSpin { to { transform: rotate(360deg); } }
  `;
  function injectCSS() {
    if (document.getElementById("cms-css")) return;
    const st = document.createElement("style"); st.id = "cms-css"; st.textContent = CSS; document.head.appendChild(st);
  }
  injectCSS();

  // ---- Google Sheet (pestaña Display) ----
  const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHRNDDgG_8_D2IXqbMNs-lrYgoJpeDZJLCSjCm1zI7fvXcvqEg0HMN-WcbtRtb-1w9gHKd7D77foHM/pub?gid=940809333&single=true&output=csv";
  function parseCSV(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else if (c !== "\r") cell += c;
    }
    row.push(cell); rows.push(row);
    return rows.map(r => r.map(c => c.trim()));
  }
  function num(s) {
    if (s == null) return null;
    const t = String(s).replace(/[€%\s]/g, "").replace(/\./g, "").replace(",", ".");
    return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null;
  }
  // Filas "Etiqueta,Valor" del Sheet (primera aparición de cada etiqueta) -> [{label, value, raw}]
  function sheetValues(text) {
    const seen = new Set(), out = [];
    for (const r of parseCSV(text)) {
      if (!r[0] || /^\[/.test(r[0]) || num(r[1]) == null) continue;
      const k = r[0].toLowerCase().replace(/\s+/g, " ");
      if (seen.has(k)) continue; seen.add(k);
      out.push({ label: r[0].replace(/\s+/g, " "), value: num(r[1]), raw: r[1] });
    }
    return out;
  }
  const keyOf = l => String(l || "").toLowerCase().replace(/\s+/g, " ").trim();

  async function fetchList(name) {
    try { const r = await fetch("/api/" + name, { cache: "no-store" }); if (!r.ok) return null; return await r.json(); }
    catch (e) { return null; }
  }

  async function fetchSlides() {
    try { const r = await fetch("/api/slides", { cache: "no-store" }); if (!r.ok) return null; return await r.json(); }
    catch (e) { return null; }
  }

  // ================= Ventas: ráfaga + pantalla de celebración =================
  // Comerciales de la tabla KAM del Sheet (cabecera "KAM"; se ignora el total B2B)
  function sheetKams(text) {
    const rows = parseCSV(text), out = [];
    const h = rows.findIndex(r => (r[0] || "").toUpperCase() === "KAM");
    if (h < 0) return out;
    for (let i = h + 1; i < rows.length; i++) {
      const r = rows[i];
      if (/^\[/.test(r[0] || "") || (r[0] && !r.slice(1).some(c => c))) break;
      if (!r[0] || num(r[1]) == null || /^(b2b|total)/i.test(r[0])) continue;
      out.push(r[0].charAt(0) + r[0].slice(1).toLowerCase());
    }
    return out;
  }

  let AC = null;
  const audioCtx = () => AC || (AC = new (window.AudioContext || window.webkitAudioContext)());
  function noiseBuf(ac, sec) {
    const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function roomIR(ac, sec, decay) {   // eco de sala sintético (estéreo)
    const len = ac.sampleRate * sec, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  // Ráfaga de metralleta: cada disparo = chasquido agudo + cuerpo de ruido filtrado + golpe grave + clic mecánico,
  // con pequeñas variaciones aleatorias, eco de sala y algún casquillo cayendo. Devuelve los instantes de cada disparo.
  function machineGun({ shots = 16, rate = 13, volume = 1 } = {}) {
    const ac = audioCtx(); if (ac.state === "suspended") ac.resume();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 8; comp.attack.value = .001; comp.release.value = .12;
    const master = ac.createGain(); master.gain.value = .9 * volume; comp.connect(master).connect(ac.destination);
    const conv = ac.createConvolver(); conv.buffer = roomIR(ac, 1.6, 3.2);
    const wet = ac.createGain(); wet.gain.value = .32; conv.connect(wet).connect(comp);
    const bus = ac.createGain(); bus.connect(comp); bus.connect(conv);
    const nb = noiseBuf(ac, .6), t0 = ac.currentTime + .06, times = [];
    const env = (g, t, peak, dur) => { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + dur); };
    for (let i = 0; i < shots; i++) {
      const t = t0 + i / rate + (Math.random() - .5) * .014, v = .8 + Math.random() * .35;
      times.push(t - ac.currentTime);
      // chasquido supersónico
      const c = ac.createBufferSource(); c.buffer = nb; const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2500;
      const cg = ac.createGain(); env(cg, t, 1.1 * v, .03); c.connect(hp).connect(cg).connect(bus); c.start(t, Math.random() * .4, .05);
      // cuerpo del disparo
      const b = ac.createBufferSource(); b.buffer = nb; const lp = ac.createBiquadFilter(); lp.type = "lowpass";
      lp.frequency.setValueAtTime(7000, t); lp.frequency.exponentialRampToValueAtTime(260, t + .16); lp.Q.value = .8;
      const bg = ac.createGain(); env(bg, t, 1.4 * v, .22); b.connect(lp).connect(bg).connect(bus); b.start(t, Math.random() * .3, .3);
      // golpe grave
      const o = ac.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(130 + Math.random() * 20, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
      const og = ac.createGain(); env(og, t, 1.3 * v, .16); o.connect(og).connect(bus); o.start(t); o.stop(t + .2);
      // clic mecánico del cerrojo
      const k = ac.createOscillator(); k.type = "square"; k.frequency.value = 1800 + Math.random() * 600;
      const kg = ac.createGain(); env(kg, t + .035, .08, .012); k.connect(kg).connect(bus); k.start(t + .03); k.stop(t + .06);
      // casquillos cayendo (algunos)
      if (Math.random() < .35) {
        const tc = t + .25 + Math.random() * .35;
        [5200, 7400].forEach(f => { const p = ac.createOscillator(); p.frequency.value = f * (.9 + Math.random() * .2);
          const pg = ac.createGain(); env(pg, tc, .05, .09); p.connect(pg).connect(master); p.start(tc); p.stop(tc + .1); });
      }
    }
    return times;
  }

  const SALE_CSS = `
  .sale-ovl { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; overflow: hidden;
              background: radial-gradient(circle at 50% 45%, rgba(11,53,82,.96), rgba(10,24,38,.98)); font-family: Lato, sans-serif; color: #fff;
              opacity: 0; transition: opacity .35s; }
  .sale-ovl.on { opacity: 1; } .sale-ovl.out { opacity: 0; transition: opacity .7s; }
  .sale-ovl canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .sale-flash { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(255,52,76,.75), rgba(255,52,76,0) 60%); opacity: 0; }
  .sale-flash.hit { animation: saleFlash .09s ease-out; }
  .sale-tracer { position: absolute; height: .5vmin; left: -40%; width: 40%; border-radius: 1vmin; background: linear-gradient(90deg, rgba(255,200,80,0), #FFE08A, #fff);
                 box-shadow: 0 0 2vmin #FFC000; animation: saleTracer .16s linear forwards; }
  .sale-card { position: relative; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 2.2vmin; transform: scale(.6); opacity: 0; }
  .sale-ovl.on .sale-card { animation: saleIn .7s cubic-bezier(.2,1.5,.4,1) .1s forwards; }
  .sale-card.shake { animation: saleShake .09s linear !important; opacity: 1; transform: none; }
  .sale-tag { font-family: Montserrat, sans-serif; font-weight: 900; letter-spacing: .14em; font-size: 4.2vmin; padding: .4em 1.1em; border-radius: .4em;
              background: #FF344C; box-shadow: 0 0 5vmin rgba(255,52,76,.8); text-transform: uppercase; }
  .sale-amount { font-family: Montserrat, sans-serif; font-weight: 900; font-size: 19vmin; line-height: 1; letter-spacing: -.02em; white-space: nowrap;
                 background: linear-gradient(180deg, #fff 15%, #5DD5DC 65%, #1AB8C4); -webkit-background-clip: text; background-clip: text; color: transparent;
                 filter: drop-shadow(0 0 3vmin rgba(26,184,196,.75)); font-variant-numeric: tabular-nums; }
  .sale-kam { font-family: Montserrat, sans-serif; font-weight: 800; font-size: 7.5vmin; text-shadow: 0 0 3vmin rgba(26,184,196,.5); }
  .sale-kam small { display: block; font-size: .32em; letter-spacing: .25em; color: #1AB8C4; font-weight: 700; margin-bottom: .3em; }
  .sale-client { font-size: 4.2vmin; color: #D6D6D6; } .sale-client b { color: #fff; font-family: Montserrat, sans-serif; }
  @keyframes saleFlash { from { opacity: 1; } to { opacity: 0; } }
  @keyframes saleTracer { to { left: 110%; } }
  @keyframes saleIn { to { transform: scale(1); opacity: 1; } }
  @keyframes saleShake { 0% { transform: translate(0,0); } 25% { transform: translate(-1.2vmin,.8vmin) rotate(-.6deg); } 50% { transform: translate(1vmin,-1vmin) rotate(.5deg); } 75% { transform: translate(-.6vmin,-.4vmin); } 100% { transform: none; } }`;
  (() => { const st = document.createElement("style"); st.textContent = SALE_CSS; document.head.appendChild(st); })();

  const queue = []; let showing = false;
  // Ajustes de la celebración (sonido subido en el gestor, duración, volumen)
  let celeb = { sound: "", hold: 20, volume: 1 };
  async function loadCeleb() { const d = await fetchList("celebration"); if (d && !Array.isArray(d)) celeb = { ...celeb, ...d }; }
  const fmtEur = v => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(v)) + " €";
  function celebrateSale(ev, { sound = true, settings = null } = {}) { queue.push({ ev, sound, settings }); if (!showing) nextSale(); }
  function nextSale() {
    const item = queue.shift(); if (!item) { showing = false; return; }
    showing = true;
    const { ev, sound } = item, imp = +ev.importe || 0, cfg = { ...celeb, ...(item.settings || {}) };
    const hold = Math.max(5, +cfg.hold || 20) * 1000;
    const ovl = document.createElement("div"); ovl.className = "sale-ovl";
    ovl.innerHTML = `<canvas></canvas><div class="sale-flash"></div>
      <div class="sale-card"><div class="sale-tag">¡Nueva venta!</div><div class="sale-amount">0 €</div>
        <div class="sale-kam"><small>KAM</small>${esc(ev.kam || "")}</div>
        ${ev.cliente ? `<div class="sale-client">Cliente · <b>${esc(ev.cliente)}</b></div>` : ""}</div>`;
    document.body.appendChild(ovl);
    document.querySelectorAll("video").forEach(v => { if (!v.paused) { v.dataset.salePaused = 1; v.pause(); } });
    requestAnimationFrame(() => ovl.classList.add("on"));
    const flash = ovl.querySelector(".sale-flash"), card = ovl.querySelector(".sale-card"), amt = ovl.querySelector(".sale-amount");
    let times = [], audio = null;
    if (sound && cfg.sound) {
      // Sonido subido en el gestor: los destellos acompañan sus primeros segundos (≈12 disparos/s)
      audio = new Audio(cfg.sound); audio.volume = Math.min(1, Math.max(0, +cfg.volume ?? 1));
      audio.play().catch(() => {});
      times = Array.from({ length: 48 }, (_, i) => .03 + i / 12);
    } else {
      try { if (sound) times = machineGun({ shots: 30, volume: Math.min(1, +cfg.volume ?? 1) }); } catch (e) {}
      if (!times.length) times = Array.from({ length: 30 }, (_, i) => .06 + i / 13);
    }
    times.forEach((t, i) => setTimeout(() => {
      flash.classList.remove("hit"); void flash.offsetWidth; flash.classList.add("hit");
      if (i > 5) { card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake"); }
      const tr = document.createElement("div"); tr.className = "sale-tracer"; tr.style.top = (8 + Math.random() * 84) + "%";
      tr.style.transform = `rotate(${(Math.random() - .5) * 14}deg)`; ovl.appendChild(tr); setTimeout(() => tr.remove(), 200);
    }, t * 1000));
    // contador del importe
    const t0 = performance.now() + 250, dur = 1600;
    (function count(now) {
      const k = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
      amt.textContent = "+" + fmtEur(imp * e);
      if (k < 1 && ovl.isConnected) requestAnimationFrame(count);
    })(performance.now());
    // chispas con los colores de marca al terminar la ráfaga
    const cv = ovl.querySelector("canvas"), ctx = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#FF344C", "#1AB8C4", "#5DD5DC", "#FFC000", "#ffffff"], parts = [];
    const burst = (n, x, y) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 14;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, life: 1, c: cols[i % cols.length], r: 2 + Math.random() * 4, sq: Math.random() < .5 }); } };
    const endBurst = (times[times.length - 1] || 1.2) * 1000;
    setTimeout(() => { burst(260, cv.width / 2, cv.height / 2); }, endBurst);
    setTimeout(() => { burst(140, cv.width * .2, cv.height * .3); burst(140, cv.width * .8, cv.height * .35); }, endBurst + 500);
    // fuegos de chispas repetidos mientras dura la celebración
    for (let t = endBurst + 2500; t < hold - 1500; t += 2200)
      setTimeout(() => burst(160, cv.width * (.15 + Math.random() * .7), cv.height * (.2 + Math.random() * .4)), t);
    (function anim() {
      if (!ovl.isConnected) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of parts) { if (p.life <= 0) continue; p.x += p.vx; p.y += p.vy; p.vy += .35; p.vx *= .985; p.life -= .009;
        ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c;
        if (p.sq) ctx.fillRect(p.x, p.y, p.r * 2, p.r * 1.2); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); } }
      requestAnimationFrame(anim);
    })();
    const endAt = hold + 800;
    setTimeout(() => { ovl.classList.add("out"); if (audio) { const a = audio, f = setInterval(() => { a.volume = Math.max(0, a.volume - .1); if (a.volume <= 0) { a.pause(); clearInterval(f); } }, 70); } }, hold);
    setTimeout(() => { ovl.remove(); document.querySelectorAll("video[data-sale-paused]").forEach(v => { delete v.dataset.salePaused; v.play().catch(() => {}); }); nextSale(); }, endAt);
  }
  // Las teles preguntan cada 3 s si hay ventas nuevas (solo las posteriores a cargar la página)
  function listenSales(opts = {}) {
    let last = null;
    const poll = async () => {
      try {
        const r = await fetch("/api/events?after=" + (last ?? ""), { cache: "no-store" }); if (!r.ok) return;
        const d = await r.json();
        if (last != null) d.events.forEach(ev => celebrateSale(ev, opts));
        last = d.last;
      } catch (e) {}
    };
    loadCeleb(); setInterval(loadCeleb, 60000);
    poll(); setInterval(poll, 3000);
  }

  const isAudio = u => /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(u || "");
  return { isAudio, loadCeleb, TEMPLATES, render, active, sheetKams, machineGun, celebrateSale, listenSales, onShow, onHide, waitsForVideo, isVideo, fetchSlides, fetchList, esc, CSV_URL, parseCSV, num, sheetValues, keyOf };
})();
