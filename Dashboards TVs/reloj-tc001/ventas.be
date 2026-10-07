# @name Ventas
# @desc KPIs de facturación desde Google Sheet (CSV publicado)
# @config url text "URL CSV del Sheet" default="https://docs.google.com/spreadsheets/d/e/2PACX-1vQHRNDDgG_8_D2IXqbMNs-lrYgoJpeDZJLCSjCm1zI7fvXcvqEg0HMN-WcbtRtb-1w9gHKd7D77foHM/pub?gid=940809333&single=true&output=csv"
# @config every number "Refresco" default=15 min=5 max=60 unit=min
# @config page_s number "Segundos por pantalla" default=8 min=3 max=30 unit=s
# @config night_from number "Noche desde (hora)" default=21 min=0 max=23
# @config night_to number "Noche hasta (hora)" default=8 min=0 max=23
# @config day_bright number "Brillo de día" default=120 min=1 max=255
# @config night_bright number "Brillo de noche" default=10 min=1 max=255

import string
import json

# Iconos 8x8 dibujados a mano ('#' = pixel encendido)
var ICON_EUR = [
  "..####..",
  ".#....#.",
  "####....",
  ".#......",
  "####....",
  ".#....#.",
  "..####..",
  "........"]
var ICON_SUM = [
  ".######.",
  ".#......",
  "..#.....",
  "...#....",
  "..#.....",
  ".#......",
  ".######.",
  "........"]
var ICON_UP = [
  "...##...",
  "..####..",
  ".######.",
  "##.##.##",
  "...##...",
  "...##...",
  "...##...",
  "........"]
var ICON_DOWN = [
  "...##...",
  "...##...",
  "...##...",
  "##.##.##",
  ".######.",
  "..####..",
  "...##...",
  "........"]
var ICON_TARGET = [
  "..####..",
  ".#....#.",
  "#..##..#",
  "#.####.#",
  "#..##..#",
  ".#....#.",
  "..####..",
  "........"]

# Sonidos (aproximación con el zumbador piezo)
var SND_SHOT = "shot:d=32,o=7,b=300:c,a6,f6,d6,b5,g5,e5,c5,a4,f4"
var SND_GOAL = "goal:d=32,o=7,b=300:c,a6,f6,d6,b5,g5,e5,c5,a4,f4,8p,c,a6,f6,d6,b5,g5,e5,c5,a4,f4,8p,c,a6,f6,d6,b5,g5,e5,c5,a4,f4,4p,8c6,8e6,8g6,2c"

var GREEN = 0x00D040
var AMBER = 0xFFA000
var RED   = 0xFF2020
var WHITE = 0xFFFFFF
var BLUE  = 0x40A0FF
var GREY  = 0x606060

class Ventas
  var mes, pend, ytd, crec     # valores numéricos (nil = sin dato)
  var t0, timer_id, night_state

  def init()
    self.mes  = store.get("v_mes")
    self.pend = store.get("v_pend")
    self.ytd  = store.get("v_ytd")
    self.crec = store.get("v_crec")
    self.t0 = 0
  end

  def setup()
    self.fetch()
    self.timer_id = timer.every(int(store.get("every", 15)) * 60000, / -> self.fetch())
  end

  # ---------- datos ----------

  def fetch()
    http.get(store.get("url"), / body, status -> self.on_body(body, status))
  end

  def rep(s, a, b)
    return string.split(s, a).concat(b)
  end

  def num(raw)
    var s = raw
    for junk : ['"', "€", "%", " ", "\r", "."]
      s = self.rep(s, junk, "")
    end
    s = self.rep(s, ",", ".")
    if size(s) == 0 return nil end
    return real(s)
  end

  def on_body(body, status)
    if body == nil || status != 200
      log("Ventas: fallo HTTP " + str(status))
      return
    end
    var mes, pend, ytd, crec
    for line : string.split(body, "\n")
      # Los bloques "[tipo] ..." son para el dashboard de la TV: fin de los KPIs del reloj
      if size(line) > 0 && line[0] == "[" break end
      var i = string.find(line, ",")
      if i <= 0 continue end
      var label = string.tolower(line[0 .. i - 1])
      var val = self.num(line[i + 1 ..])
      if val == nil continue end
      # Primera coincidencia gana
      if string.find(label, "crecimiento") >= 0      if crec == nil crec = val end
      elif string.find(label, "pendiente") >= 0      if pend == nil pend = val end
      elif string.find(label, "acumulada") >= 0      if ytd == nil ytd = val end
      elif string.find(label, "mensual") >= 0        if mes == nil mes = val end
      end
    end
    log(string.format("Ventas: mes=%s pend=%s ytd=%s crec=%s", str(mes), str(pend), str(ytd), str(crec)))
    self.check_alerts(mes, pend)
    if mes  != nil self.mes = mes   store.set("v_mes", mes) end
    if pend != nil self.pend = pend store.set("v_pend", pend) end
    if ytd  != nil self.ytd = ytd   store.set("v_ytd", ytd) end
    if crec != nil self.crec = crec store.set("v_crec", crec) end
  end

  # Brillo nocturno: se aplica al cambiar de franja (loop corre ~1/s)
  def loop()
    var n = self.is_night()
    if n == self.night_state return end
    self.night_state = n
    var b = int(store.get(n ? "night_bright" : "day_bright", n ? 10 : 120))
    http.patch("http://127.0.0.1/api/v1/settings", json.dump({"brightness": b}),
      / body, status -> log("Ventas: brillo " + str(b) + " -> " + str(status)),
      {"headers": {"Content-Type": "application/json"}})
  end

  # ---------- avisos ----------

  def is_night()
    var h = hour()
    var a = int(store.get("night_from", 21))
    var b = int(store.get("night_to", 8))
    if a > b return h >= a || h < b end
    return h >= a && h < b
  end

  def alert(txt, color, rtttl)
    notify({"text": txt, "color": color, "textBlinkMs": 250, "durationMs": 8000})
    if !self.is_night() sound.rtttl(rtttl) end
  end

  def check_alerts(mes, pend)
    # Objetivo del mes alcanzado (una vez por mes)
    var key = year() * 100 + month()
    if pend != nil && pend >= 0 && store.get("goal_key") != key
      store.set("goal_key", key)
      self.alert("OBJETIVO!", GREEN, SND_GOAL)
      return
    end
    # Factura nueva: sube la facturación del mes
    if mes != nil && self.mes != nil && mes > self.mes + 0.5
      self.alert("+" + self.money(mes - self.mes), GREEN, SND_SHOT)
    end
  end

  # ---------- formato ----------

  def money(v)
    var a = v < 0 ? -v : v
    var s
    if a >= 1000000
      s = string.format("%.2fM", a / 1000000.0)
    else
      s = string.format("%.2fk", a / 1000.0)
    end
    s = self.rep(s, ".", ",")
    return v < 0 ? "-" + s : s
  end

  def pct(v)
    var s = self.rep(string.format("%.1f%%", v < 0 ? -v : v), ".", ",")
    return (v < 0 ? "-" : "+") + s
  end

  def days_in_month()
    var m = month()
    if m == 2
      var y = year()
      return (y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)) ? 29 : 28
    end
    return (m == 4 || m == 6 || m == 9 || m == 11) ? 30 : 31
  end

  # ---------- rotación ----------

  def page_ms() return int(store.get("page_s", 8)) * 1000 end
  def duration() return 4 * self.page_ms() end
  def on_show() self.t0 = now_ms() end

  # ---------- dibujo ----------

  def draw_icon(rows, color)
    for y : 0 .. 7
      var r = rows[y]
      for x : 0 .. 7
        if r[x] == "#" pixel(x, y, color) end
      end
    end
  end

  def value(s, color)
    var room = width() - 9
    if text_width(s) <= room
      text(9 + (room - text_width(s)) / 2, 6, s, color)
    else
      scroll_text(9, 6, room, s, color, {"mode": "bounce", "speed": 60, "holdMs": 800})
    end
  end

  def draw()
    clear()
    var page = ((now_ms() - self.t0) / self.page_ms()) % 4

    if page == 0          # Facturación del mes + progreso vs objetivo
      if self.mes == nil self.value("...", GREY) return end
      var goal = (self.pend != nil && self.pend < 0) ? self.mes - self.pend : self.mes
      var p = goal > 0 ? self.mes * 100.0 / goal : 100.0
      var pace = day() * 100.0 / self.days_in_month()
      var c = p >= pace ? GREEN : (p >= pace * 0.8 ? AMBER : RED)
      self.draw_icon(ICON_EUR, 0xFFC000)
      self.value(self.money(self.mes), c)
      progress(int(p > 100 ? 100 : p), c, 0x202020, 9)

    elif page == 1        # Facturación acumulada
      if self.ytd == nil self.value("...", GREY) return end
      self.draw_icon(ICON_SUM, BLUE)
      self.value(self.money(self.ytd), WHITE)

    elif page == 2        # Crecimiento acumulado vs año anterior
      if self.crec == nil self.value("...", GREY) return end
      var c = self.crec >= 0 ? GREEN : RED
      self.draw_icon(self.crec >= 0 ? ICON_UP : ICON_DOWN, c)
      self.value(self.pct(self.crec), c)

    else                  # Pendiente para objetivo del mes
      if self.pend == nil self.value("...", GREY) return end
      if self.pend >= 0
        self.draw_icon(ICON_TARGET, GREEN)
        self.value("OK", GREEN)
      else
        self.draw_icon(ICON_TARGET, AMBER)
        self.value(self.money(self.pend), AMBER)
      end
    end
  end
end

return Ventas()
