<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/work-placements/assets/logo.svg" alt="Logo de la extensión work-placements: un edificio de empresa con un marcador de mapa encima y un sobre al lado" width="112"/>

# work-placements

**Tu agente de IA busca, contacta y sigue a las empresas donde tu alumnado hace sus prácticas.**<br/>
Empresas por sector en tu zona, sus webs leídas para saber cómo contactarlas, un registro de cada empresa y contacto en tu ordenador, Excel para el departamento, y borradores de correo que revisas y envías tú.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing)** · [🇬🇧 Read in English](README.md)

</div>

Esta extensión da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit) o a Claude Code un servidor MCP, [work-placements-mcp](../../mcps/work-placements/), y cómo usarlo, para un docente que busca empresas que acojan alumnado: FP dual, prácticas o Erasmus+. El agente busca en OpenStreetMap negocios por sector en un municipio o alrededor (y en Google Places, con tu propia clave), lee sus webs públicas para encontrar un correo genérico, un teléfono y su página de "trabaja con nosotros", lleva un registro de empresas y contactos con lo próximo que toca, importa la hoja de cálculo del curso pasado y exporta el registro a Excel, y escribe un borrador de correo por empresa a partir de tu propia carta. No envía nada. Conoce estas herramientas y fuentes, no cómo buscar empresas bien ni las normas de ningún país: un agente que sí, como [miyagi](https://github.com/falkenslab/miyagi), la instala.

## ✨ Por qué esta extensión

- 🗺️ **Primero, datos abiertos.** Los negocios de OpenStreetMap por sector, citados; Google Places solo con tu propia clave, guardando solo lo que permiten sus condiciones.
- 🗂️ **Un registro, sin repetidos.** Cada búsqueda marca las empresas que ya tienes; los duplicados por CIF, o por nombre y municipio, se rechazan.
- ✉️ **Borradores, nunca envía.** Un `.eml` por empresa a su dirección genérica, a partir de tu carta, que Outlook o Thunderbird abren sin enviar para que lo revises y lo envíes.
- 📞 **El seguimiento del día.** A quién llamar o escribir, según los próximos pasos que anotaste, y las empresas que dejaron de responder.
- 📊 **Excel para el departamento.** El registro como libro de Excel o CSV; las personas con nombre solo si lo pides.
- 🔒 **Respetuosa y privada.** Respeta `robots.txt`, nada automático en LinkedIn, y el registro en tu ordenador.

## 🚀 Inicio rápido

Necesitas [Node.js](https://nodejs.org) 20 o posterior, y un agente con agent-kit o Claude Code.

```bash
# Un agente hecho con agent-kit (su propio comando)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add work-placements@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install work-placements@falkenslab
```

Pide tres ajustes, todos opcionales: tu zona (un municipio o una comarca donde buscar cuando no dices otra), tu clave de la API de Google Places (secreta, solo para buscar también los negocios de Google Maps), y la carpeta de borradores y exportaciones (si no, `Documentos/work-placements`). Luego pide: "Busca empresas de informática en La Laguna que no estén aún en mi registro." En Codex, que no tiene ajustes, di la zona en el chat; allí no se busca en Google Places.

## 💬 Qué puedes pedir

- 👩‍🏫 "Busca empresas de electricidad y de automoción a menos de 10 km de Tacoronte."
- 👩‍🏫 "Lee las webs de las que no tienen correo y dime cómo contactarlas."
- 👩‍🏫 "Importa las empresas del curso pasado de este Excel."
- 👩‍🏫 "Escribe un borrador a cada empresa que añadí hoy, con mi carta de Documentos."
- 👩‍🏫 "He llamado a Talleres Ruiz: están interesados, hay que volver a llamar el lunes."
- 👩‍🏫 "¿A quién tengo que llamar o escribir hoy?"
- 👩‍🏫 "Exporta las empresas con acuerdo para el departamento."

## 🧰 Qué incluye

| Parte | Qué es |
| --- | --- |
| 🔌 Servidor | `npx -y @falkenslab/work-placements-mcp@0.1.0` ([work-placements-mcp](../../mcps/work-placements/)): `search_companies`, `read_company_site`, `add_company`, `update_company`, `log_contact`, `list_companies`, `pipeline_summary`, `import_companies`, `export_companies`, `draft_emails`, `server_info` |
| 🧩 `find-companies` | Las fuentes en orden (el registro, tus hojas de cálculo, OpenStreetMap, Google Places con tu clave, las webs de las empresas), zonas y sectores, y añadir solo lo que eliges, sin duplicados; en miyagi, el botón "Buscar empresas" |
| 🧩 `company-outreach` | Un borrador por empresa a partir de tu carta, a su dirección genérica, identificándote y con una línea para darse de baja, nunca un envío masivo; llamadas, visitas y correos enviados anotados como contactos |
| 🧩 `placement-tracker` | Los estados, los seguimientos del día y las empresas sin respuesta, y la exportación para el departamento; en miyagi, el botón "Seguimiento de empresas" |
| 🧩 `linkedin-and-sites` | Qué puede y qué no puede hacer el agente con LinkedIn, Google Maps, directorios y webs, y cómo usas cada uno a mano |
| 🤖 `company-researcher` | Subagente: investiga empresas (el registro, OpenStreetMap, sus propias webs) y devuelve una ficha breve de cada una (no cambia nada) |

## 📐 Buenas prácticas con estas fuentes

- **Primero, el registro.** Las empresas del curso pasado y las que dijeron "ahora no" van antes que cualquier búsqueda.
- **OpenStreetMap es desigual.** Pocos negocios tienen allí un correo (en torno a uno de cada ocho en una muestra) y menos de la mitad un teléfono: las webs de las empresas completan lo que falta.
- **Las condiciones de Google Places** limitan lo que se puede guardar: su `place_id`, más lo que tú confirmes o diga la web de la propia empresa.
- **Un mensaje a una empresa**, a su dirección genérica, diciendo quién eres y cómo darse de baja. Las normas sobre el correo no solicitado varían: consulta con el delegado de protección de datos de tu administración si tienes dudas.
- **Las personas con nombre son datos personales.** Se quedan en tu ordenador, solo lo necesario, y van a una exportación solo si lo pides.
- **LinkedIn, solo a mano.** Sus condiciones prohíben los bots y la extracción de datos, y suspende las cuentas que los usan.

## 📚 Documentación

- **[Copyright y licencia de OpenStreetMap](https://www.openstreetmap.org/copyright)**: la ODbL, y cómo citarla.
- **[Elementos del mapa de OpenStreetMap](https://wiki.openstreetmap.org/wiki/ES:Caracter%C3%ADsticas_del_mapa)**: las etiquetas (`office`, `craft`, `shop`, `industrial`…) por las que también se puede buscar un sector.
- **[La API de Places (New) de Google](https://developers.google.com/maps/documentation/places/web-service/text-search)**: cómo obtener una clave, y sus políticas.
- **[Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing)**: cómo ejecuta agent-kit una extensión y comprueba lo que necesita.

## 🛠️ Desarrollo

El código del servidor está en [`mcps/work-placements/`](../../mcps/work-placements/), publicado en npm como `@falkenslab/work-placements-mcp`, que `.mcp.json` ejecuta con `npx` en una versión fija; allí `npm install`, `npm run build` y `npm test` lo construyen y lo prueban. Para probar un cambio, enlaza la extensión en un agente (`my-agent extension add ./extensions/work-placements --link`) y compruébala con `claude plugin validate --strict extensions/work-placements` y `node scripts/check-tools.mjs work-placements`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
