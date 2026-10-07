# CLAUDE.md · Dashboards TVs

Contexto para trabajar en este proyecto. Leer README.md primero.

## Quién y cómo
- Dueño: Carlos (founder). Español de España, directo, bullets, sin rodeos.
- Las teles las ve dirección: datos sensibles OK en pantalla.
- Todo lo visual sigue la identidad Gelt (tokens en `web/dashboard.html` `:root` y en `web/cms.js` CSS). No usar Inter ni colores fuera de la paleta.

## Reglas de seguridad del proyecto
- El token de Pipedrive **nunca** se pide ni se usa desde el chat: se pega en el gestor (Integraciones) y vive solo en `~/dashboard/content/pipedrive.json` (600). `server.py` nunca lo devuelve.
- La contraseña del gestor la crea el usuario en la primera visita; solo se guarda el hash PBKDF2 (`auth.json`).
- El gestor es solo red local por decisión de negocio (se descartó login con Google/túnel público). No exponerlo a internet sin preguntar.
- No commitear `content/auth.json`, `content/pipedrive.json` ni backups de firmware (ver .gitignore).

## Código
- Sin build ni dependencias: HTML + JS vanilla y Python 3 estándar. Mantenerlo así salvo decisión explícita.
- `web/cms.js` es compartido por las tres páginas: plantillas (`TEMPLATES`, `render`), utilidades del Sheet (`parseCSV`, `num`, `sheetValues`, `sheetKams`), sonido (`machineGun`) y celebración (`celebrateSale`, `listenSales`).
- Las plantillas usan unidades de contenedor (`cqw`) para escalar igual en tele horizontal, vertical y vista previa.
- `dashboard.html` aplica cambios de datos/pantallas en el siguiente cambio de pantalla (variable `pending`) para no cortar vídeos.
- Fechas: siempre locales (no `toISOString()`, que es UTC).
- Formato del Sheet: `web/FORMATO-SHEET.md`. El reloj y el dashboard buscan los 4 KPIs por palabras ("mensual", "pendiente", "acumulada", "crecimiento"), primera coincidencia; no renombrar esas filas.

## Raspberry (gelt@dashboard.local)
- Desktop labwc (Wayland). Variables para comandos gráficos: `XDG_RUNTIME_DIR=/run/user/$(id -u) WAYLAND_DISPLAY=wayland-0`.
- Pantallas: kanshi (`~/.config/kanshi/config`); **no relee la config**, hay que reiniciarlo. Reglas de ventana en `~/.config/labwc/rc.xml` mandan cada Chromium (`--app`) a su salida.
- `pkill -f <patrón>` dentro de `ssh '...'` mata la propia sesión si el patrón aparece literal en el comando. Usar `pkill -x chromium` y `pkill -f "[d]ashboard/serv""er.py"`.
- Enchufar/desenchufar teles en caliente puede bloquear el compositor → reiniciar (`sudo -n /sbin/reboot` está permitido sin contraseña).
- Audio por HDMI0 (`vc4-hdmi-0`), volumen PipeWire al 100 %; el volumen real se controla en la tele.
- Verificar visualmente con `grim -o HDMI-A-1 /tmp/x.png` (o HDMI-A-2) y copiarlo con scp.

## Pruebas
- Local: `DASH_HOME=<dir con www -> web> DASH_BIND=127.0.0.1 DASH_PORT=8081 DASH_AWTRIX=http://127.0.0.1:9 python3 raspberry/server.py`.
- Pipedrive simulado: `DASH_PD_API=http://127.0.0.1:<puerto>/v1 DASH_PD_EVERY=3`.
- Capturas a resolución de tele: Chrome headless `--window-size=1920,1080` (o 1080,1920) `--virtual-time-budget=6000 --screenshot`. Parámetros útiles: `?view=N` (fija una pantalla), `?demo` (datos de ejemplo), `?noanim`.
