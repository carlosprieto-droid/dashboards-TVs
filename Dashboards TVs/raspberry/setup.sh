#!/bin/bash
# Instalación de Dashboards TVs en una Raspberry Pi 5 con Raspberry Pi OS (labwc).
# Uso: copiar la carpeta del proyecto a /tmp/dashboards-tvs y ejecutar este script como el usuario del escritorio.
# Pide la contraseña de sudo una vez. Escrito a partir de la instalación de la oficina; no probado en limpio.
set -e
SRC="$(cd "$(dirname "$0")/.." && pwd)"
D="$HOME/dashboard"

echo "== Archivos"
mkdir -p "$D/www" "$D/content/media"
rsync -a --delete "$SRC/web/" "$D/www/"
cp "$SRC"/raspberry/{server.py,kiosk.sh,watchdog.sh,tv.sh} "$D/"
chmod +x "$D"/*.sh
# contenido inicial del gestor (si la Raspberry es nueva)
[ -f "$D/content/slides.json" ] || rsync -a "$SRC/contenido/" "$D/content/"

echo "== Pantallas (kanshi)"
mkdir -p "$HOME/.config/kanshi"
cp "$SRC/raspberry/config/kanshi.config" "$HOME/.config/kanshi/config"

echo "== Arranque automático y reglas de ventana (labwc)"
mkdir -p "$HOME/.config/labwc"
{ grep -v lxsession-xdg-autostart /etc/xdg/labwc/autostart
  echo '$HOME/dashboard/kiosk.sh &'
  echo '$HOME/dashboard/watchdog.sh &'
  echo '/usr/bin/lxsession-xdg-autostart'; } > "$HOME/.config/labwc/autostart"
python3 - "$SRC/raspberry/config/labwc-windowRules.xml" <<'PY'
import os, re, sys
rules = open(sys.argv[1]).read()
s = open('/etc/xdg/labwc/rc.xml').read()
s = re.sub(r'\s*<windowRules>.*?</windowRules>', '\n  ' + rules.strip(), s, count=1, flags=re.S)
open(os.path.expanduser('~/.config/labwc/rc.xml'), 'w').write(s)
PY

echo "== Cron (teles L-V 9-19, reinicio 3:30)"
crontab "$SRC/raspberry/config/crontab"

echo "== Permisos de sistema (sudo)"
echo "$USER ALL=(root) NOPASSWD: /sbin/reboot" | sudo tee /etc/sudoers.d/020_dashboard >/dev/null
sudo chmod 440 /etc/sudoers.d/020_dashboard
sudo raspi-config nonint do_blanking 1 || true
CONN=$(nmcli -t -f NAME,DEVICE connection show --active | awk -F: '$2=="wlan0"{print $1}')
[ -n "$CONN" ] && sudo nmcli connection modify "$CONN" 802-11-wireless.powersave 2 && sudo iw dev wlan0 set power_save off || true

echo "== Listo. Reinicia la Raspberry: sudo reboot"
echo "   Gestor: http://$(hostname).local:8080/admin.html (crear contraseña en la primera visita)"
