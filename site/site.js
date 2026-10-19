const $ = (id) => document.getElementById(id);
const escape = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// Inline Markdown in short texts: `code` only.
const inline = (text) => escape(text).replace(/`([^`]+)`/g, "<code>$1</code>");
const params = new URLSearchParams(location.search);
// ?topic=miyagi (several, comma-separated): an agent links to the extensions it offers.
const chosen = new Set((params.get("topic") ?? "").split(",").map((topic) => topic.trim().toLowerCase()).filter(Boolean));
let catalog = { extensions: [] };
let failed = false;

// Shared by the home page (index.html) and the catalog (catalog.html): each runs only its own parts.
const page = document.body.dataset.page;
const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };

// The page's own texts in English and Spanish. The extensions' descriptions come from catalog.json, in the page's language when it has it (descriptions), English otherwise.
const TEXTS = {
  en: {
    title: "Give your agent new capabilities",
    pageTitle: "agent-extensions · Falken's Lab",
    catalogPageTitle: "Catalog · agent-extensions",
    description: "Extensions for Claude Code, Codex and agents built on agent-kit: search them by name or topic.",
    intro: `Extensions for Claude Code, Codex and agents built on <a href="https://github.com/falkenslab/agent-kit">agent-kit</a>: each brings its tools and the know-how to use them well. Add the marketplace once, then install what you need.`,
    browse: "Browse extensions",
    catalog: "Catalog",
    docs: "Docs",
    catalogTitle: (n) => `${n} extensions, ready to install`,
    search: "Search by name, description or topic…",
    searchLabel: "Search extensions",
    topics: "Topics",
    language: "Language",
    theme: "Theme",
    themes: { light: "Light", dark: "Dark", system: "System" },
    copy: "Copy",
    copied: "Copied",
    none: "No extension matches.",
    failed: "The catalog couldn't be loaded.",
    agent: "agent-kit",
    source: "Source",
    close: "Close",
    capabilities: "Capabilities",
    howto: "Install and use it",
    install: "Install",
    configure: "Configure",
    use: "Use it",
    installClaude: "Add the marketplace once, then install the extension:",
    installCodex: "Add the marketplace once, then install the plugin:",
    installAgent: "With your agent's own command (here `<agent>`), or from its chat's catalog:",
    needs: (r) => `It needs ${r.name}${r.version?.min ? ` ${r.version.min.replace(/\.0(\.0)?$/, "")} or later` : ""}, installed apart.`,
    howToGet: "How to install it",
    noSettings: "It needs no settings.",
    settingsClaude: (name) => `Claude Code asks for these when you install it; change them later in \`/plugin\`.`,
    settingsCodex: "Codex has no plugin settings: the extension starts with its defaults, and the agent asks you in the chat for anything it can't do without.",
    settingsAgent: (name) => `Your agent asks for these when you install it; change them later with \`<agent> extension config ${name}\`, or \`/extensions config ${name}\` in the chat.`,
    defaultIs: "default",
    required: "required",
    loading: "Loading…",
    useClaude: "Start Claude Code (`claude`) and ask, in your own words:",
    useCodex: "Start Codex (`codex`) and ask, in your own words:",
    useAgent: "Open your agent's chat and ask, in your own words:",
    noExamples: "Its README has examples of what to ask.",
    conceptsTitle: "What's in an extension",
    concepts: [
      ["🧩", "Extension", "A pack you add to your agent, like an app on your phone. Each one lets it work with something new: your Moodle courses, your Canva designs, Docker…"],
      ["📖", "Skills", "The know-how that comes with it: how to do each task well, step by step, and when to ask you first. Like the notes an expert would leave you."],
      ["🔧", "Tools", "What lets your agent actually do things instead of only talking about them: look up your courses, create a design, start a program."],
      ["✨", "Capabilities", "What your agent can do thanks to an extension, in plain words: grading, creating designs, copying a course. Skills and tools together, and what each extension's card lists."],
    ],
  },
  es: {
    title: "Dale a tu agente nuevas capacidades",
    pageTitle: "agent-extensions · Falken's Lab",
    catalogPageTitle: "Catálogo · agent-extensions",
    description: "Extensiones para Claude Code, Codex y agentes hechos con agent-kit: búscalas por nombre o por tema.",
    intro: `Extensiones para Claude Code, Codex y agentes hechos con <a href="https://github.com/falkenslab/agent-kit">agent-kit</a>: cada una trae sus herramientas y lo que hay que saber para usarlas bien. Añade el marketplace una vez e instala lo que necesites.`,
    browse: "Ver las extensiones",
    catalog: "Catálogo",
    docs: "Documentación",
    catalogTitle: (n) => `${n} extensiones, listas para instalar`,
    search: "Busca por nombre, descripción o tema…",
    searchLabel: "Buscar extensiones",
    topics: "Temas",
    language: "Idioma",
    theme: "Tema",
    themes: { light: "Claro", dark: "Oscuro", system: "Sistema" },
    copy: "Copiar",
    copied: "Copiado",
    none: "Ninguna extensión coincide.",
    failed: "No se ha podido cargar el catálogo.",
    agent: "agent-kit",
    source: "Código",
    close: "Cerrar",
    capabilities: "Capacidades",
    howto: "Instálala y úsala",
    install: "Instalar",
    configure: "Configurar",
    use: "Usar",
    installClaude: "Añade el marketplace una vez e instala la extensión:",
    installCodex: "Añade el marketplace una vez e instala el plugin:",
    installAgent: "Con la orden de tu agente (aquí `<agent>`), o desde el catálogo de su chat:",
    needs: (r) => `Necesita ${r.name}${r.version?.min ? ` ${r.version.min.replace(/\.0(\.0)?$/, "")} o posterior` : ""}, instalado aparte.`,
    howToGet: "Cómo instalarlo",
    noSettings: "No necesita ajustes.",
    settingsClaude: (name) => `Claude Code te los pide al instalarla; cámbialos luego en \`/plugin\`.`,
    settingsCodex: "Codex no tiene ajustes de plugins: la extensión arranca con sus valores por defecto y, si le falta algo imprescindible, el agente te lo pide en el chat.",
    settingsAgent: (name) => `Tu agente te los pide al instalarla; cámbialos luego con \`<agent> extension config ${name}\`, o con \`/extensions config ${name}\` en el chat.`,
    defaultIs: "por defecto",
    required: "obligatorio",
    loading: "Cargando…",
    useClaude: "Abre Claude Code (`claude`) y pide, con tus palabras:",
    useCodex: "Abre Codex (`codex`) y pide, con tus palabras:",
    useAgent: "Abre el chat de tu agente y pide, con tus palabras:",
    noExamples: "Su README tiene ejemplos de qué pedirle.",
    conceptsTitle: "Qué hay en una extensión",
    concepts: [
      ["🧩", "Extensión", "Un paquete que añades a tu agente, como una app en el móvil. Cada una le permite trabajar con algo nuevo: tus cursos de Moodle, tus diseños de Canva, Docker…"],
      ["📖", "Habilidades", "El saber hacer que trae: cómo hacer bien cada tarea, paso a paso, y cuándo preguntarte antes. Como las notas que te dejaría alguien experto."],
      ["🔧", "Herramientas", "Lo que permite a tu agente hacer las cosas de verdad, y no solo hablar de ellas: consultar tus cursos, crear un diseño, arrancar un programa."],
      ["✨", "Capacidades", "Lo que tu agente sabe hacer gracias a una extensión, dicho en llano: calificar, crear diseños, copiar un curso. Son las habilidades y las herramientas juntas, y lo que muestra la tarjeta de cada extensión."],
    ],
  },
};
// ?lang=es, else what the person chose last time, else the browser's language.
function stored(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function pickLang() {
  for (const lang of [params.get("lang"), stored("lang"), ...(navigator.languages ?? [navigator.language])]) {
    const short = String(lang ?? "").slice(0, 2).toLowerCase();
    if (short in TEXTS) return short;
  }
  return "en";
}
let lang = pickLang();
const t = (key) => TEXTS[lang][key];

// Light, dark or the system's; the choice is remembered (the head applies it before painting).
let theme = ["light", "dark"].includes(stored("theme")) ? stored("theme") : "system";
function applyTheme() {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  for (const button of document.querySelectorAll("[data-theme-choice]")) {
    const choice = button.dataset.themeChoice;
    button.setAttribute("aria-pressed", String(choice === theme));
    button.title = t("themes")[choice];
    button.setAttribute("aria-label", t("themes")[choice]);
  }
}
for (const button of document.querySelectorAll("[data-theme-choice]")) {
  button.addEventListener("click", () => {
    theme = button.dataset.themeChoice;
    try { theme === "system" ? localStorage.removeItem("theme") : localStorage.setItem("theme", theme); } catch {}
    applyTheme();
  });
}

function applyLang() {
  document.documentElement.lang = lang;
  document.title = page === "catalog" ? t("catalogPageTitle") : t("pageTitle");
  document.querySelector('meta[name="description"]').content = t("description");
  setText("title", t("title"));
  if ($("intro")) $("intro").innerHTML = t("intro");
  for (const a of document.querySelectorAll("#intro a")) Object.assign(a, { target: "_blank", rel: "noopener" });
  setText("nav-catalog", t("catalog"));
  setText("nav-docs", t("docs"));
  setText("nav-cta", t("browse"));
  setText("cta-browse", t("browse"));
  setText("catalog-eyebrow", t("catalog"));
  setText("concepts-title", t("conceptsTitle"));
  if ($("concepts")) $("concepts").replaceChildren(...t("concepts").map(([icon, name, text]) => {
    const card = document.createElement("div");
    card.className = "concept";
    card.innerHTML = `<span class="icon" aria-hidden="true">${icon}</span><h3>${escape(name)}</h3><p>${escape(text)}</p>`;
    return card;
  }));
  if ($("search")) {
    $("search").placeholder = t("search");
    $("search").setAttribute("aria-label", t("searchLabel"));
    $("chips").setAttribute("aria-label", t("topics"));
  }
  $("langs").setAttribute("aria-label", t("language"));
  $("themes").setAttribute("aria-label", t("theme"));
  for (const button of document.querySelectorAll(".lang")) button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
  renderCount();
  applyTheme();
}
for (const button of document.querySelectorAll(".lang")) {
  button.addEventListener("click", () => {
    lang = button.dataset.lang;
    try { localStorage.setItem("lang", lang); } catch {}
    const url = new URL(location.href);
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
    applyLang();
    if ($("add")) renderAdd();
    if ($("grid")) renderGrid();
    if ($("details")?.open && openExtension) openDetails(openExtension);
  });
}
let openExtension = null;

// Served from the repository locally (site/ next to catalog.json), images and files from there.
const local = ["localhost", "127.0.0.1"].includes(location.hostname);
const asset = (url) => (local && url ? url.replace(/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/main\//, "../") : url);
const rawOf = (blob) => blob.replace(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\//, "https://raw.githubusercontent.com/$1/");

// The three clients, always in this order: Claude Code, Codex, an agent on agent-kit. The chosen tab is remembered.
const LOGOS = {
  claude: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#d97757" d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg>`,
  codex: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>`,
  agentKit: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="22" height="22" rx="6" fill="#2e3a8c"/><rect x="6" y="36" width="22" height="22" rx="6" fill="#4453b8"/><rect x="32" y="36" width="22" height="22" rx="6" fill="#6272de"/><rect x="37" y="5" width="22" height="22" rx="6" fill="#ff6b57"/></svg>`,
};
const CLIENTS = [
  { key: "claude", label: () => "Claude Code" },
  { key: "codex", label: () => "Codex" },
  { key: "agentKit", label: () => t("agent") },
];
let chosenClient = stored("client") || "claude";
let tabsCount = 0;
// Tabs over the clients; content(key) gives each panel's nodes.
function clientTabs(content) {
  const id = `tabs${++tabsCount}`;
  const tabs = document.createElement("div");
  tabs.className = "tabs";
  const list = document.createElement("div");
  list.className = "tablist";
  list.setAttribute("role", "tablist");
  const panel = document.createElement("div");
  panel.className = "tabpanel";
  panel.id = `${id}-panel`;
  panel.setAttribute("role", "tabpanel");
  const buttons = CLIENTS.map((client) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab";
    button.id = `${id}-${client.key}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", panel.id);
    button.innerHTML = `${LOGOS[client.key]}${escape(client.label())}`;
    button.addEventListener("click", () => select(client.key, true));
    return button;
  });
  let current;
  list.addEventListener("keydown", (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    const at = CLIENTS.findIndex((client) => client.key === current);
    const next = CLIENTS[(at + step + CLIENTS.length) % CLIENTS.length];
    select(next.key, true);
    buttons[CLIENTS.indexOf(next)].focus();
  });
  function select(key, remember) {
    const client = CLIENTS.find((c) => c.key === key) ?? CLIENTS[0];
    current = client.key;
    buttons.forEach((button, i) => {
      const on = CLIENTS[i] === client;
      button.setAttribute("aria-selected", String(on));
      button.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", `${id}-${client.key}`);
    panel.replaceChildren(...content(client.key));
    if (remember) {
      chosenClient = client.key;
      try { localStorage.setItem("client", chosenClient); } catch {}
    }
  }
  list.append(...buttons);
  tabs.append(list, panel);
  select(chosenClient, false);
  return tabs;
}
const describe = (extension) => extension.descriptions?.[lang] ?? extension.description;
function commandBox(text) {
  const box = document.createElement("code");
  box.className = "cmd";
  box.append(text);
  const copy = document.createElement("button");
  copy.className = "copy";
  copy.type = "button";
  copy.textContent = t("copy");
  copy.addEventListener("click", async (event) => {
    event.stopPropagation();
    try { await navigator.clipboard.writeText(text); } catch { return; }
    copy.textContent = t("copied");
    setTimeout(() => (copy.textContent = t("copy")), 1500);
  });
  box.append(copy);
  return box;
}
function logo(extension, size) {
  if (extension.logo) {
    const img = document.createElement("img");
    img.className = "logo";
    img.alt = "";
    img.src = asset(extension.logo);
    img.style.width = img.style.height = `${size}px`;
    return img;
  }
  const tile = document.createElement("div");
  tile.className = "logo initial";
  tile.style.width = tile.style.height = `${size}px`;
  tile.textContent = extension.name.slice(0, 1).toUpperCase();
  return tile;
}
const repoName = () => (catalog.repository ?? "").replace(/^https:\/\/github\.com\//, "");
const addCommands = (key) => ({
  claude: [catalog.add?.claudeCode],
  codex: repoName() ? [`codex plugin marketplace add ${repoName()}`] : [],
  agentKit: [`<agent> ${catalog.add?.agentKit}`],
})[key].filter(Boolean);
function renderAdd() {
  if (!catalog.add) return;
  $("add").replaceChildren(clientTabs((key) => addCommands(key).map(commandBox)));
}
function renderCount() {
  if (!$("catalog-title")) return;
  $("catalog-title").textContent = catalog.extensions.length ? t("catalogTitle")(catalog.extensions.length) : t("catalog");
}
function renderChips() {
  const topics = [...new Set(catalog.extensions.flatMap((extension) => extension.topics))].sort();
  $("chips").innerHTML = "";
  for (const topic of topics) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `chip${chosen.has(topic) ? " on" : ""}`;
    chip.textContent = topic;
    chip.setAttribute("aria-pressed", String(chosen.has(topic)));
    chip.addEventListener("click", () => {
      if (chosen.has(topic)) chosen.delete(topic);
      else chosen.add(topic);
      const url = new URL(location.href);
      if (chosen.size) url.searchParams.set("topic", [...chosen].join(","));
      else url.searchParams.delete("topic");
      history.replaceState(null, "", url);
      renderChips();
      renderGrid();
    });
    $("chips").append(chip);
  }
}
function renderGrid() {
  const words = $("search").value.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = catalog.extensions.filter(
    (extension) =>
      [...chosen].every((topic) => extension.topics.includes(topic)) &&
      words.every((word) => `${extension.name} ${extension.description} ${describe(extension)} ${extension.topics.join(" ")}`.toLowerCase().includes(word)),
  );
  if (failed) return void ($("grid").innerHTML = `<p class="empty">${escape(t("failed"))}</p>`);
  $("grid").innerHTML = shown.length ? "" : `<p class="empty">${escape(t("none"))}</p>`;
  for (const extension of shown) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    const top = document.createElement("div");
    top.className = "top";
    top.append(logo(extension, 48));
    top.insertAdjacentHTML("beforeend", `<div class="name">${escape(extension.name)}<span class="ver">${escape(extension.version)}</span></div>`);
    card.append(top);
    card.insertAdjacentHTML("beforeend", `<p class="desc">${escape(describe(extension))}</p><div class="tags">${extension.topics.map((topic) => `<span class="tag">${escape(topic)}</span>`).join("")}</div>`);
    card.addEventListener("click", () => openDetails(extension));
    $("grid").append(card);
  }
}

// What a card needs beyond catalog.json, from the extension's own files: its settings (plugin.json's userConfig)
// and examples of what to ask (the "💬" section of its README in the page's language).
const files = new Map();
function fetchText(url) {
  if (!files.has(url)) files.set(url, fetch(asset(url)).then((response) => (response.ok ? response.text() : null)).catch(() => null));
  return files.get(url);
}
async function settingsOf(extension) {
  const text = await fetchText(rawOf(extension.readme).replace(/README\.md$/, ".claude-plugin/plugin.json"));
  try { return Object.entries(JSON.parse(text).userConfig ?? {}); } catch { return []; }
}
async function examplesOf(extension) {
  const readme = rawOf(extension.readmes?.[lang] ?? extension.readme);
  const text = (await fetchText(readme)) ?? (await fetchText(rawOf(extension.readme)));
  const lines = (text ?? "").split("\n");
  const start = lines.findIndex((line) => line.startsWith("## 💬"));
  if (start < 0) return [];
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  return lines.slice(start + 1, end < 0 ? undefined : end).filter((line) => line.startsWith("- ")).map((line) => line.slice(2).replace(/^[\p{Extended_Pictographic}‍️\s]+/u, "").trim()).slice(0, 4);
}

const step = (title, ...nodes) => {
  const li = document.createElement("li");
  li.className = "step";
  li.innerHTML = `<h3>${escape(title)}</h3>`;
  const content = document.createElement("div");
  content.className = "content";
  content.append(...nodes);
  li.append(content);
  return li;
};
const para = (html, className) => Object.assign(document.createElement("p"), { innerHTML: html, className: className ?? "" });
// One client's panel: install, configure, use.
function howTo(extension, key, data) {
  const name = extension.name;
  const steps = document.createElement("ol");
  steps.className = "steps";
  const install = {
    claude: [t("installClaude"), [catalog.add?.claudeCode, extension.install.claudeCode]],
    codex: [t("installCodex"), [repoName() && `codex plugin marketplace add ${repoName()}`, `codex plugin add ${name}@${catalog.marketplace}`]],
    agentKit: [t("installAgent"), [`<agent> ${catalog.add?.agentKit}`, `<agent> ${extension.install.agentKit}`]],
  }[key];
  const needs = (extension.requirements ?? []).map((r) => para(`${escape(t("needs")(r))}${r.install?.url ? ` <a href="${escape(r.install.url)}" target="_blank" rel="noopener">${escape(t("howToGet"))}</a>` : ""}`, "need"));
  steps.append(step(t("install"), para(inline(install[0])), ...install[1].filter(Boolean).map(commandBox), ...needs));
  let configure;
  if (!data) configure = [para(escape(t("loading")), "muted")];
  else if (!data.settings.length) configure = [para(escape(t("noSettings")))];
  // Codex has no plugin settings: only how the extension behaves without them.
  else if (key === "codex") configure = [para(inline(t("settingsCodex")))];
  else {
    const intro = { claude: t("settingsClaude")(name), agentKit: t("settingsAgent")(name) }[key];
    const list = document.createElement("ul");
    list.className = "settings";
    list.innerHTML = data.settings.map(([k, s]) => {
      const fallback = s.required ? t("required") : s.default === undefined || s.default === "" ? "" : `${t("defaultIs")}: ${String(s.default)}`;
      return `<li><strong>${escape(s.title ?? k)}</strong><span class="key">${escape(k)}${fallback ? ` · ${escape(fallback)}` : ""}</span>${s.description ? `<span class="d">${escape(s.description)}</span>` : ""}</li>`;
    }).join("");
    configure = [para(inline(intro)), list];
  }
  steps.append(step(t("configure"), ...configure));
  const useIntro = { claude: t("useClaude"), codex: t("useCodex"), agentKit: t("useAgent") }[key];
  let use;
  if (!data) use = [para(escape(t("loading")), "muted")];
  else if (!data.examples.length) use = [para(escape(t("noExamples")))];
  else {
    const list = document.createElement("ul");
    list.className = "prompts";
    list.innerHTML = data.examples.map((example) => `<li class="prompt">${inline(example)}</li>`).join("");
    use = [para(inline(useIntro)), list];
  }
  steps.append(step(t("use"), ...use));
  return [steps];
}
function openDetails(extension) {
  openExtension = extension;
  const dialog = $("details");
  dialog.innerHTML = "";
  if (extension.banner) {
    const banner = document.createElement("img");
    banner.className = "banner";
    banner.alt = "";
    banner.src = asset(extension.banner);
    dialog.append(banner);
  }
  const body = document.createElement("div");
  body.className = "body";
  const top = document.createElement("div");
  top.className = "top";
  top.append(logo(extension, 52));
  top.insertAdjacentHTML("beforeend", `<div><h2 id="details-title">${escape(extension.name)}<span class="ver">${escape(extension.version)}</span></h2><div class="desc">${escape(extension.author ?? "")}${extension.license ? ` · ${escape(extension.license)}` : ""}</div></div>`);
  const readme = extension.readmes?.[lang] ?? extension.readme;
  top.insertAdjacentHTML("beforeend", `<div class="links"><a href="${escape(readme)}" target="_blank" rel="noopener" title="README" aria-label="README">📖</a><a href="${escape(extension.homepage)}" target="_blank" rel="noopener" title="${escape(t("source"))}" aria-label="${escape(t("source"))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></a><button type="button" class="x" title="${escape(t("close"))}" aria-label="${escape(t("close"))}">✕</button></div>`);
  top.querySelector(".x").addEventListener("click", () => dialog.close());
  body.append(top);
  body.insertAdjacentHTML("beforeend", `<p class="desc">${escape(describe(extension))}</p><div class="tags">${extension.topics.map((topic) => `<span class="tag">${escape(topic)}</span>`).join("")}</div>`);
  // Its capabilities (skills + tools), in the page's language, English where a text is missing.
  if (extension.capabilities?.length) {
    const items = extension.capabilities.map((capability) => {
      const text = capability.texts?.[lang] ?? capability.texts?.en ?? { label: capability.id };
      return `<li class="cap"><strong>${escape(text.label)}</strong>${text.description ? `<span>${escape(text.description)}</span>` : ""}</li>`;
    });
    body.insertAdjacentHTML("beforeend", `<span class="label">${escape(t("capabilities"))}</span><ul class="caps">${items.join("")}</ul>`);
  }
  body.insertAdjacentHTML("beforeend", `<span class="label">${escape(t("howto"))}</span>`);
  const howto = document.createElement("div");
  howto.className = "howto";
  let data = null;
  const draw = () => howto.replaceChildren(clientTabs((key) => howTo(extension, key, data)));
  draw();
  body.append(howto);
  dialog.append(body);
  if (!dialog.open) dialog.showModal();
  Promise.all([settingsOf(extension), examplesOf(extension)]).then(([settings, examples]) => {
    if (openExtension !== extension || !howto.isConnected) return;
    data = { settings, examples };
    draw();
  });
}
if (page === "catalog") {
  $("details").addEventListener("click", (event) => event.target === $("details") && $("details").close());
  $("search").addEventListener("input", renderGrid);
}

async function load() {
  for (const url of ["catalog.json", "../catalog.json"]) {
    const response = await fetch(url).catch(() => null);
    if (response?.ok) return response.json();
  }
  throw new Error("No catalog.json.");
}
applyLang();
load()
  .then((loaded) => {
    catalog = loaded;
    if (page === "home") renderAdd();
    if (page === "catalog") {
      renderCount();
      renderChips();
      renderGrid();
    }
  })
  .catch(() => {
    failed = true;
    if (page === "catalog") renderGrid();
  });
