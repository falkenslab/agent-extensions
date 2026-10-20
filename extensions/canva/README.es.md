<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/canva/assets/logo.svg" alt="Logo de la extensión canva: un lienzo con un círculo, un triángulo y una línea de texto, dentro de un marco de selección" width="112"/>

# canva

**Tu agente de IA crea, edita y exporta tus diseños de Canva.**<br/>
A través del servidor MCP remoto oficial de Canva, con tu propia cuenta de Canva: sin instalar nada.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
![Remote MCP server](https://img.shields.io/badge/MCP-remote%20server-6272de)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 El servidor MCP de Canva](https://www.canva.dev/docs/mcp/)** · [🇬🇧 Read in English](README.md)

</div>

Esta extensión da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit), o a Claude Code, el [servidor MCP remoto oficial de Canva](https://www.canva.dev/docs/mcp/) y lo que hay que saber para usarlo: encontrar tus diseños, crear presentaciones, pósteres, infografías y fichas a partir de una descripción, editar sus textos, imágenes y páginas, generar imágenes, usar tu kit de marca y exportar a PDF, PNG, PPTX o MP4. Inicia sesión con tu cuenta de Canva (Canva para Educación es gratis para docentes) y trabaja en ella, preguntando antes de crear, cambiar o publicar nada. Sabe de Canva, no de enseñar: un agente que sabe enseñar, como [miyagi](https://github.com/falkenslab/miyagi), la instala para preparar los materiales de una clase. La hace Falken's Lab, no Canva.

## ✨ Por qué esta extensión

- 🧩 **Nada que instalar.** El servidor de Canva funciona en Canva; la extensión solo le dice al agente dónde está y cómo usarlo.
- 🔐 **Tu cuenta, tu inicio de sesión.** Entras en Canva desde tu navegador; el agente nunca ve tu contraseña.
- 🎚️ **Pregunta antes de cambiar.** Lo que solo lee va directo; crear, editar, comentar o publicar una plantilla espera a tu sí, que en agent-kit pide el propio agente (sí, en esta sesión, siempre, no, nunca), y el modo plan solo deja pasar lo que lee. Borrar páginas, publicar una plantilla y comentar preguntan siempre.
- 🕶️ **Los datos de otros se quedan fuera.** Nombres de alumnos, listas de clase o fotos nunca van a Canva sin tu sí expreso.
- 🧭 **Conoce tu plan.** En Free dice qué necesita otro plan (kits de marca, cambiar de tamaño, calidad Pro) y ofrece lo que Free permite.
- 🤖 **Capacidades, no una marca.** Sus capacidades (`design-create`, `design-export`…) son neutras, así que las habilidades de un agente dependen de lo que se puede hacer.

## 🚀 Empezar

Necesitas una cuenta de Canva y un agente con agent-kit 0.27 o posterior, o Claude Code 2.1.271 o posterior.

```bash
# Un agente hecho con agent-kit (su propio comando)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add canva@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install canva@falkenslab
```

Después inicia sesión: en el chat de un agente, `/extensions sign-in canva` abre en tu navegador la página de inicio de sesión de Canva (y muestra el enlace, por si es otro ordenador); en Claude Code, `/mcp`. Una sesión nueva no lo vuelve a pedir. Luego pregunta: «¿Cuáles son mis cinco últimos diseños de Canva?»

Aún no está probada en Codex.

## 💬 Qué puedes pedir

- 👩‍🏫 «Haz una presentación de 10 diapositivas que introduzca la fotosíntesis para alumnos de 12 años.»
- 👩‍🏫 «Convierte este esquema en una ficha de una página y expórtala en PDF para imprimir.»
- 👩‍🏫 «Haz una infografía del ciclo del agua con el kit de marca de mi centro.»
- 🧑‍💻 «Busca mi póster de la feria de ciencias y cambia la fecha al 14 de noviembre.»
- 🧑‍💻 «Quita el fondo de la foto de la página 2.»
- 🧑‍🎓 «Exporta la presentación de mi proyecto en PPTX para presentarla en clase.»

## 🧰 Qué incluye

| Parte | Qué es |
| --- | --- |
| 🔌 Servidor | `https://mcp.canva.com/mcp`, el servidor MCP remoto oficial de Canva, tras el inicio de sesión OAuth de Canva |
| 🎨 `designs` | Encontrar, crear, copiar, cambiar de tamaño, importar y editar diseños, carpetas y comentarios, y lo que impone Canva |
| 🖼️ `images` | Generar y editar imágenes, quitar fondos, separar capas y llevar archivos a Canva |
| 🏷️ `brand` | Kits y plantillas de marca, y qué ofrecer en un plan sin ellos |
| 📤 `export` | Qué formato para cada uso, la calidad del plan Free, los elementos premium y guardar el archivo antes de que caduque el enlace |
| 🕶️ `what-goes-to-canva` | Lo que nunca va a Canva sin tu sí: los datos personales de otras personas |

## 📚 Documentación

- **[El servidor MCP de Canva](https://www.canva.dev/docs/mcp/)**: qué es y cómo funciona, de Canva.
- **[Sus herramientas y límites](https://www.canva.dev/docs/mcp/tools/)**: cada herramienta, los planes que la tienen y sus límites.
- **[Instalar extensiones](https://falkenslab.github.io/agent-kit/es/docs/extensions/installing)**: en un agente hecho con agent-kit, e iniciar sesión en un servidor remoto.

## 🛠️ Desarrollo

La extensión es un plugin de Claude Code: `.claude-plugin/plugin.json` (los datos de agent-kit en `metadata["agent-kit"]`, con las herramientas que solo leen en `readOnlyTools`), `.mcp.json` con el servidor remoto y `skills/`. Para probar un cambio, enlázala en un agente en vez de instalarla (`my-agent extension add ./extensions/canva --link`) y compruébala con `claude plugin validate --strict extensions/canva`. Cómo ejecuta agent-kit un servidor remoto: [Un servidor remoto](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing#a-remote-server).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
