# Formato de la pestaña Display

El dashboard de la TV y el reloj TC001 leen la misma pestaña.

## 1. Parte de arriba: KPIs (no mover)

Filas `Etiqueta,Valor`. Las 4 actuales las usan el reloj y la vista Resumen.
Cualquier fila nueva `Etiqueta,Valor` aparece como tarjeta extra en el Resumen.

```
,Septiembre
Facturación mensual,259.128€
Facturación pendiente objetivo mes,-193.372€
Facturación acumulada,2.943.618€
% crecimiento facturación acumulada vs año anterior,6,5%
```

No renombres esas 4 etiquetas: el reloj las busca por las palabras
"mensual", "pendiente", "acumulada" y "crecimiento".

## 2. Debajo: bloques (cada uno = una pantalla que rota)

- Fila 1: `[tipo] Título` en la columna A
- Fila 2: cabeceras
- Filas siguientes: datos
- Una fila vacía cierra el bloque

Tipos: `barras`, `linea`, `ranking`, `tabla`.

```
[barras] Facturación mensual 2026 vs 2025
Mes,2025,2026
Ene,241.300€,262.100€
Feb,228.900€,251.400€

[linea] Facturación acumulada 2026 vs 2025
Mes,2025,2026
Ene,241.300€,262.100€
Feb,470.200€,513.500€

[ranking] Top clientes 2026
Cliente,Facturación
Cliente A,412.300€
Cliente B,338.900€

[tabla] Últimas facturas
Fecha,Cliente,Importe
28/09,Cliente C,18.400€
```

Reglas:
- `barras` / `linea`: la última columna es el periodo actual (cian); si hay 2 series, la primera va en azul grisáceo como referencia. Máximo 4 series.
- `ranking`: se ordena como lo pongas; muestra hasta 10 filas.
- `tabla`: hasta 12 filas.
- Números en formato español (`259.128€`, `6,5%`). Pueden salir de fórmulas.

## 3. Termómetros (TV vertical)

Bloque `[termometro]` en la misma pestaña. Cada fila = un termómetro.

```
[termometro] Objetivos
Nombre,Objetivo,Actual,Unidad,Inicio,Fin,Color
Venta semanal,120.000,78.400,€,29/09,03/10,rojo
Deals cerrados semana,10,6,deals,29/09,03/10,cian
Facturación Q4,1.500.000,259.128,€,01/10,31/12,verde
```

- `Actual` puede ser una fórmula (p.ej. suma de ventas de la semana).
- `Inicio` / `Fin` (dd/mm o dd/mm/aaaa) calculan la marca de "ritmo" y los días que quedan. Opcionales.
- `Color`: rojo, cian, verde, amarillo, naranja, morado, rosa (o un hex `#RRGGBB`).
- Hasta 3 por pantalla; si hay más, rotan en grupos cada 20 s.
- Al llegar al 100 %: "GOAL!", disparos y fanfarria (una vez por objetivo).

## 4. Histórico y desglose (TV horizontal, pantalla "Histórico · Total compañía")

- Fila de meses (`,enero,febrero,…,diciembre`) y debajo: `Objetivo facturación mensual`, `Objetivo facturación acumulada mensual`, `Facturación mensual`, `Facturación acumulada` (total compañía).
- Fila `Desglose facturación` y debajo una fila por línea (`Promo/data`, `Users`, `GiftCards`) con los importes en las mismas columnas de meses. Con 2 o más líneas con datos, las barras salen apiladas. Filas `Total`/`B2B` se ignoran (son subtotales).
- Meses futuros a 0 € no se pintan.
