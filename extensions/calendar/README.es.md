<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/calendar/assets/logo.svg" alt="Logo de la extensión calendar: una hoja de calendario con la cabecera coral y un día marcado con una campana" width="112"/>

# calendar

**Tu agente de IA pone tus fechas en un archivo de calendario, listo para importar.**<br/>
Eventos, entregas y planes como un archivo .ics que importan Google Calendar, Outlook y Calendario de Apple, en tu zona horaria, con eventos de todo el día, repeticiones y avisos.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing)** · [🇬🇧 Read in English](README.md)

</div>

Esta extensión da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit), o a Claude Code, su propio servidor MCP pequeño y lo que hay que saber para usarlo: convertir las fechas que prepara contigo (las sesiones de una clase, las entregas de una tarea, un plan de estudio) en un archivo `.ics` (iCalendar, RFC 5545) en tu ordenador, que importas en la aplicación de calendario que ya usas; y leer un `.ics` de vuelta, para comprobarlo o ver qué tiene. No toca ninguna cuenta de calendario: el archivo lo importas tú. Sabe del formato, no de enseñar ni de estudiar: un agente como [miyagi](https://github.com/falkenslab/miyagi) o [padawan](https://github.com/falkenslab/padawan) la instala para llevar las fechas de un plan a un calendario, y las fechas en sí (el calendario escolar, los festivos) las aportas tú.

## ✨ Por qué esta extensión

- 🌍 **En tu zona horaria.** Las horas son las de tu reloj; el archivo lleva las reglas de tu zona, horario de verano incluido, así que una clase a las 9:00 sigue a las 9:00 todo el año.
- 📅 **Todo el día o a una hora.** Los días de entrega y las semanas de exámenes como eventos de todo el día; las clases y las sesiones con su inicio y su fin.
- 🔁 **Repeticiones.** Cada semana los lunes y miércoles, cada dos semanas, el primer jueves de cada mes, hasta un día o tantas veces, sin los días que no hay.
- 🔔 **Avisos.** Los minutos, las horas o los días antes que quieras.
- ✅ **Comprobado antes de escribirlo.** Un fin antes de su inicio, una zona desconocida o una fecha imposible se rechazan, todos los problemas a la vez, y un archivo que ya existe nunca se reemplaza si no lo dices.
- 👀 **Se puede leer de vuelta.** Los eventos de cualquier archivo `.ics`, con las repeticiones en palabras, para revisar lo que vas a importar.
- 🪶 **Nada que instalar.** Un solo archivo de servidor, ejecutado con `npx`; sin cuenta y sin red.

## 🚀 Empezar

Necesitas [Node.js](https://nodejs.org) 20 o posterior, y un agente con agent-kit o Claude Code.

```bash
# Un agente hecho con agent-kit (su propio comando)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add calendar@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install calendar@falkenslab
```

No necesita ajustes. Luego pide: «Pon mis entregas del ensayo en un archivo de calendario, con un aviso el día antes». Codex también la instala (`codex plugin marketplace add falkenslab/agent-extensions` y luego `codex plugin add calendar@falkenslab`) y allí funciona igual, skill y servidor.

## 💬 Qué puedes pedir

- 👩‍🏫 «Hazme un .ics con mis clases de martes y jueves del 15 de septiembre al 18 de diciembre, de 10:00 a 11:30, salvo la semana del 2 de noviembre.»
- 👩‍🏫 «Pon las tres entregas del tema en un archivo de calendario, cada una con un aviso una semana y un día antes.»
- 🧑‍🎓 «Convierte mi plan de estudio para los exámenes en un calendario que pueda importar en Google Calendar.»
- 🧑‍🎓 «¿Qué hay en este .ics que me ha mandado el instituto?»
- 🧑‍🎓 «¿Cómo lo importo en Outlook?»

## 🧰 Qué incluye

| Parte | Qué es |
| --- | --- |
| 🔌 Servidor | `npx -y @falkenslab/calendar-mcp@0.1.0`: `write_ics`, `read_ics`, `server_info` |
| 📅 `calendar-files` | La zona horaria de la persona, todo el día o a una hora, repeticiones o eventos sueltos, avisos, dónde guardarlo, leer el archivo de vuelta e importarlo en Google Calendar, Outlook o Calendario de Apple |

## 📚 Documentación

- **[Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing)**: cómo ejecuta agent-kit una extensión con su propio servidor.
- **[La referencia de extensiones](https://falkenslab.github.io/agent-kit/es/docs/extensions/reference)**: cada campo del manifiesto y de `metadata["agent-kit"]`.
- **[RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)**: el formato iCalendar que siguen los archivos.

## 🛠️ Desarrollo

El código del servidor está en [`mcps/calendar/`](../../mcps/calendar/), publicado en npm como `@falkenslab/calendar-mcp`; allí `npm install`, `npm run build` y `npm test` lo construyen y lo prueban. La extensión ejecuta una versión publicada, fijada en `.mcp.json`: un servidor nuevo se publica primero y luego se fija aquí. Para probar un cambio, enlaza la extensión en un agente (`my-agent extension add ./extensions/calendar --link`) y compruébala con `claude plugin validate --strict extensions/calendar`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
