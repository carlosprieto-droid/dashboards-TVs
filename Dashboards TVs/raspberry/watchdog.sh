#!/bin/bash
# Vigila las teles: si una se apaga/enciende (la Raspberry deja de verla o la vuelve a ver),
# reaplica la disposición de pantallas (giro de la vertical) y relanza cada página en su tele.
export XDG_RUNTIME_DIR=/run/user/$(id -u) WAYLAND_DISPLAY=wayland-0
state() { cat /sys/class/drm/card*-HDMI-A-1/status /sys/class/drm/card*-HDMI-A-2/status 2>/dev/null | tr '\n' ' '; }
prev=$(state)
while sleep 5; do
  now=$(state)
  [ "$now" = "$prev" ] && continue
  sleep 6                       # la tele tarda unos segundos en estabilizarse
  now=$(state); prev=$now
  logger -t dashboard "teles cambiaron: $now"
  pkill -x kanshi; sleep 1; (setsid nohup kanshi >/dev/null 2>&1 &); sleep 4
  pkill -x chromium; sleep 2
  (setsid nohup "$HOME/dashboard/kiosk.sh" >/tmp/kiosk.log 2>&1 &)
done
