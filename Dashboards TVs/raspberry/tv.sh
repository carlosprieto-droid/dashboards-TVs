#!/bin/bash
# Enciende (on) o apaga (off) las teles. Uso: tv.sh on|off
#  - HDMI-CEC: orden de encendido/standby (las LG solo la obedecen con SIMPLINK + Auto Power Sync activados)
#  - Señal de vídeo (wlopm): al cortarla, la tele se apaga sola por "sin señal"; al volver, la imagen sigue en su sitio
export XDG_RUNTIME_DIR=/run/user/$(id -u) WAYLAND_DISPLAY=wayland-0
if [ "$1" = "on" ]; then
  wlopm --on '*' >/dev/null 2>&1
  sleep 2
fi
for d in /dev/cec0 /dev/cec1; do
  [ -e "$d" ] || continue
  cec-ctl -d "$d" --playback -S >/dev/null 2>&1
  pa=$(cec-ctl -d "$d" | awk -F': ' '/Physical Address/{print $2; exit}')
  if [ "$1" = "on" ]; then
    cec-ctl -d "$d" --to 0 --image-view-on >/dev/null 2>&1
    [ -n "$pa" ] && [ "$pa" != "f.f.f.f" ] && cec-ctl -d "$d" --to 0 --active-source phys-addr="$pa" >/dev/null 2>&1
  else
    cec-ctl -d "$d" --to 0 --standby >/dev/null 2>&1
  fi
done
[ "$1" = "off" ] && wlopm --off '*' >/dev/null 2>&1
exit 0
