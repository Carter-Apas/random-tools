import mermaid from "mermaid";
import "./style.css";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  theme: "base",
  suppressErrorRendering: true,
  fontFamily: "Aptos, Segoe UI, sans-serif",
  maxTextSize: 100_000,
  secure: [
    "secure",
    "securityLevel",
    "startOnLoad",
    "maxTextSize",
    "suppressErrorRendering",
  ],
  themeVariables: {
    primaryColor: "#e1f1f0",
    primaryTextColor: "#21374a",
    primaryBorderColor: "#147d83",
    lineColor: "#52758a",
    secondaryColor: "#e7eef8",
    tertiaryColor: "#f2f6f9",
    fontSize: "15px",
    edgeLabelBackground: "#ffffff",
  },
});

const $ = (id) => document.getElementById(id);
const actor =
  crypto.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
const drafts = new Map();
let state = null;
let activeId = null;
let connected = false;
let renderVersion = 0;
let renderedSvg = "";
let zoom = null;
let diagramWidth = 600;
let renderTimer;
let noticeTimer;
let dialogTab = null;

const activeTab = () => state?.tabs.find((tab) => tab.id === activeId);
const sourceFor = (id) =>
  drafts.get(id)?.source ??
  state?.tabs.find((tab) => tab.id === id)?.source ??
  "";
const dirty = () => [...drafts.values()].some((draft) => draft.dirty);
function notice(message, persistent = false) {
  clearTimeout(noticeTimer);
  $("notice").textContent = message;
  $("notice").hidden = !message;
  if (!persistent && message)
    noticeTimer = setTimeout(() => {
      $("notice").hidden = true;
    }, 7000);
}
function connection(live) {
  connected = live;
  $("connection").className = `connection ${live ? "live" : "offline"}`;
  $("connection-text").textContent = live
    ? "Live with everyone"
    : "Reconnecting…";
  controls();
}
function controls() {
  const tab = activeTab();
  const draft = drafts.get(activeId);
  $("add-tab").disabled = !state || !connected || state.tabs.length >= 10;
  $("add-tab").title =
    state?.tabs.length >= 10
      ? "Maximum of 10 tabs reached"
      : "Create a shared diagram";
  $("tab-count").textContent = `${state?.tabs.length ?? 0}/10`;
  $("rename").disabled = !tab || !connected || !!draft?.dirty;
  $("delete").disabled =
    !tab || !connected || state.tabs.length <= 1 || !!draft?.dirty;
  $("delete").title =
    state?.tabs.length === 1 ? "Keep at least one tab" : "Delete tab";
  $("source").disabled = !state;
  $("conflict").hidden = !draft?.conflict;
  $("conflict-message").textContent = tab
    ? "Someone else edited this tab. Your draft is still here. Choose which source to keep."
    : "This tab was deleted or the workspace reset. Copy your draft before opening another tab.";
  $("use-shared").hidden = !tab;
  $("keep-mine").hidden = !tab;
  $("keep-mine").disabled = !connected || !!draft?.saving;
  $("save-status").textContent = draft?.conflict
    ? "Draft needs your attention"
    : draft?.saving
      ? "Saving…"
      : draft?.error
        ? draft.error
        : draft?.dirty
          ? connected
            ? "Waiting to save…"
            : "Offline · draft kept in this page"
          : state
            ? "All changes saved"
            : "Loading workspace…";
}
function renderTabs() {
  if (!state) return;
  const focusId = document.activeElement?.closest("[role=tab]")?.dataset.id;
  $("tabs").replaceChildren(
    ...state.tabs.map((tab) => {
      const button = document.createElement("button");
      button.className = `tab${drafts.get(tab.id)?.dirty ? " dirty" : ""}`;
      button.type = "button";
      button.role = "tab";
      button.dataset.id = tab.id;
      button.id = `tab-${tab.id}`;
      button.setAttribute("aria-selected", String(tab.id === activeId));
      button.setAttribute("aria-controls", "workspace");
      button.tabIndex = tab.id === activeId ? 0 : -1;
      button.title = tab.name;
      button.textContent = tab.name;
      button.addEventListener("click", () => selectTab(tab.id));
      button.addEventListener("keydown", (event) => {
        const index = state.tabs.findIndex((item) => item.id === tab.id);
        let target;
        if (event.key === "ArrowRight")
          target = state.tabs[(index + 1) % state.tabs.length];
        if (event.key === "ArrowLeft")
          target =
            state.tabs[(index - 1 + state.tabs.length) % state.tabs.length];
        if (event.key === "Home") target = state.tabs[0];
        if (event.key === "End") target = state.tabs.at(-1);
        if (target) {
          event.preventDefault();
          selectTab(target.id);
          document.getElementById(`tab-${target.id}`)?.focus();
        }
      });
      return button;
    }),
  );
  if (activeTab())
    $("workspace").setAttribute("aria-labelledby", `tab-${activeId}`);
  else $("workspace").removeAttribute("aria-labelledby");
  if (focusId)
    document.getElementById(`tab-${focusId}`)?.focus({ preventScroll: true });
  controls();
}
function lineNumbers() {
  const count = $("source").value.split("\n").length;
  $("line-numbers").textContent = Array.from(
    { length: count },
    (_, i) => i + 1,
  ).join("\n");
  $("line-numbers").scrollTop = $("source").scrollTop;
  $("line-count").textContent = `${count} ${count === 1 ? "line" : "lines"}`;
}
function selectTab(id) {
  const oldDraft = drafts.get(activeId);
  if (activeId !== id && oldDraft?.dirty && !activeTab()) {
    notice(
      "Copy your draft first, then reload this page to return to the shared workspace.",
      true,
    );
    return;
  }
  activeId = id;
  $("source").value = sourceFor(id);
  document.title = `${activeTab()?.name ?? "Draft"} · Mermaid`;
  renderedSvg = "";
  zoom = null;
  $("download").disabled = true;
  $("diagram").replaceChildren();
  lineNumbers();
  renderTabs();
  scheduleRender(0);
}
function acceptState(incoming, origin) {
  if (state && incoming.id === state.id && incoming.version <= state.version)
    return;
  for (const [id, draft] of drafts) {
    const tab = incoming.tabs.find((item) => item.id === id);
    if (
      draft.dirty &&
      (!tab || (tab.revision !== draft.revision && origin !== actor))
    ) {
      draft.conflict = true;
      clearTimeout(draft.timer);
    }
  }
  state = incoming;
  if (!activeId || (!activeTab() && !drafts.get(activeId)?.dirty)) {
    selectTab(state.tabs[0].id);
  } else {
    renderTabs();
    document.title = `${activeTab()?.name ?? "Draft"} · Mermaid`;
    if (
      !drafts.get(activeId)?.dirty &&
      $("source").value !== sourceFor(activeId)
    ) {
      $("source").value = sourceFor(activeId);
      lineNumbers();
      scheduleRender();
    }
  }
  $("workspace").setAttribute("aria-busy", "false");
}
async function request(path, method, body) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, actor }),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || "Unable to save. Try again.");
    error.status = response.status;
    if (result.state) acceptState(result.state, null);
    throw error;
  }
  acceptState(result, actor);
  return result;
}
function scheduleSave(id, delay = 450) {
  const draft = drafts.get(id);
  if (!draft) return;
  clearTimeout(draft.timer);
  if (connected && !draft.conflict && !draft.saving)
    draft.timer = setTimeout(() => save(id), delay);
}
async function save(id) {
  const draft = drafts.get(id);
  if (!draft?.dirty || draft.saving || draft.conflict || !connected) return;
  draft.saving = true;
  draft.error = "";
  const sent = draft.source;
  controls();
  try {
    const result = await request(`/api/tabs/${id}`, "PATCH", {
      source: sent,
      expectedRevision: draft.revision,
    });
    const saved = result.tabs.find((tab) => tab.id === id);
    draft.revision = saved.revision;
    if (draft.source === sent) drafts.delete(id);
    else {
      draft.conflict =
        state.tabs.find((tab) => tab.id === id)?.revision !== saved.revision;
      draft.saving = false;
      scheduleSave(id);
    }
    if (
      activeId === id &&
      !drafts.has(id) &&
      $("source").value !== sourceFor(id)
    ) {
      $("source").value = sourceFor(id);
      lineNumbers();
      scheduleRender();
    }
  } catch (error) {
    draft.saving = false;
    if (error.status === 409 || error.status === 404) draft.conflict = true;
    else {
      draft.error = "Not saved · retrying";
      scheduleSave(id, 3000);
    }
  }
  renderTabs();
}
$("source").addEventListener("input", () => {
  const tab = activeTab();
  let draft = drafts.get(activeId);
  if (!draft) {
    draft = { source: "", revision: tab.revision, dirty: true };
    drafts.set(activeId, draft);
  }
  draft.source = $("source").value;
  draft.dirty = true;
  draft.error = "";
  lineNumbers();
  renderTabs();
  scheduleSave(activeId);
  scheduleRender();
});
$("source").addEventListener("scroll", () => {
  $("line-numbers").scrollTop = $("source").scrollTop;
});
$("source").addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const editor = $("source");
    const start = editor.selectionStart;
    editor.setRangeText("    ", start, editor.selectionEnd, "end");
    editor.dispatchEvent(new Event("input"));
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    save(activeId);
  }
});
$("use-shared").addEventListener("click", () => {
  clearTimeout(drafts.get(activeId)?.timer);
  drafts.delete(activeId);
  selectTab(activeId);
});
$("keep-mine").addEventListener("click", () => {
  const draft = drafts.get(activeId);
  draft.revision = activeTab().revision;
  draft.conflict = false;
  save(activeId);
});

function scheduleRender(delay = 250) {
  clearTimeout(renderTimer);
  const version = ++renderVersion;
  const source = $("source").value;
  $("render-status").textContent = source.trim()
    ? "Rendering…"
    : "Ready for a diagram";
  $("download").disabled = true;
  renderTimer = setTimeout(() => renderDiagram(source, version), delay);
}
async function renderDiagram(source, version) {
  if (!source.trim()) {
    $("diagram").innerHTML =
      '<p class="empty-preview">A blank canvas.<br>Write or paste Mermaid source to begin.</p>';
    $("render-error").hidden = true;
    renderedSvg = "";
    return;
  }
  try {
    const result = await mermaid.render(`mermaid-${version}`, source);
    if (version !== renderVersion) return;
    renderedSvg = result.svg;
    $("diagram").innerHTML = result.svg;
    $("render-error").hidden = true;
    $("render-status").textContent = "Preview up to date";
    $("download").disabled = false;
    const svg = $("diagram").querySelector("svg");
    diagramWidth =
      svg.viewBox.baseVal.width || parseFloat(svg.getAttribute("width")) || 600;
    applyZoom();
  } catch (error) {
    if (version !== renderVersion) return;
    $("render-error").hidden = false;
    $("error-text").textContent = String(error.message || error).slice(0, 1800);
    $("render-status").textContent = "Syntax needs attention";
    if (!renderedSvg)
      $("diagram").innerHTML =
        '<p class="empty-preview">Your preview will appear once the syntax is valid.</p>';
  }
}
function applyZoom() {
  const svg = $("diagram").querySelector("svg");
  $("zoom-level").textContent =
    zoom === null ? "Fit" : `${Math.round(zoom * 100)}%`;
  $("diagram").classList.toggle("zoomed", zoom !== null);
  if (svg)
    svg.style.width = zoom === null ? "100%" : `${diagramWidth * zoom}px`;
}
$("zoom-in").addEventListener("click", () => {
  zoom = Math.min(3, (zoom ?? fitScale()) + 0.2);
  applyZoom();
});
$("zoom-out").addEventListener("click", () => {
  zoom = Math.max(0.2, (zoom ?? fitScale()) - 0.2);
  applyZoom();
});
function fitScale() {
  return (
    ($("diagram").querySelector("svg")?.getBoundingClientRect().width ||
      diagramWidth) / diagramWidth
  );
}
$("fit").addEventListener("click", () => {
  zoom = null;
  applyZoom();
});
$("toggle-source").addEventListener("click", () => {
  const hidden = $("workspace").classList.toggle("source-hidden");
  $("toggle-source").textContent = hidden ? "Show source" : "Hide source";
  $("toggle-source").setAttribute("aria-pressed", String(hidden));
});
$("download").addEventListener("click", () => {
  if (!renderedSvg || $("download").disabled) return;
  const link = document.createElement("a");
  const url = URL.createObjectURL(
    new Blob([renderedSvg], { type: "image/svg+xml" }),
  );
  link.href = url;
  link.download = `${(activeTab()?.name || "diagram").replace(/[^a-z0-9_-]+/gi, "-")}.svg`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("add-tab").addEventListener("click", async () => {
  $("add-tab").disabled = true;
  try {
    const result = await request("/api/tabs", "POST", {});
    selectTab(result.tabs.at(-1).id);
    $("source").focus();
  } catch (error) {
    notice(error.message);
  }
  controls();
});
$("rename").addEventListener("click", () => {
  dialogTab = { ...activeTab() };
  $("tab-name").value = dialogTab.name;
  $("rename-error").textContent = "";
  $("rename-dialog").showModal();
  $("tab-name").select();
});
$("cancel-rename").addEventListener("click", () => $("rename-dialog").close());
$("rename-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("save-name").disabled = true;
  try {
    await request(`/api/tabs/${dialogTab.id}`, "PATCH", {
      name: $("tab-name").value,
      expectedRevision: dialogTab.revision,
    });
    $("rename-dialog").close();
  } catch (error) {
    $("rename-error").textContent = error.message;
    dialogTab = state.tabs.find((tab) => tab.id === dialogTab.id) || dialogTab;
  }
  $("save-name").disabled = false;
});
$("delete").addEventListener("click", () => {
  dialogTab = { ...activeTab() };
  $("delete-description").textContent =
    `“${dialogTab.name}” will be permanently removed.`;
  $("delete-error").textContent = "";
  $("delete-dialog").showModal();
  $("cancel-delete").focus();
});
$("cancel-delete").addEventListener("click", () => $("delete-dialog").close());
$("delete-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("confirm-delete").disabled = true;
  try {
    await request(`/api/tabs/${dialogTab.id}`, "DELETE", {
      expectedRevision: dialogTab.revision,
    });
    $("delete-dialog").close();
  } catch (error) {
    $("delete-error").textContent = error.message;
  }
  $("confirm-delete").disabled = false;
});
window.addEventListener("beforeunload", (event) => {
  if (dirty()) {
    event.preventDefault();
    event.returnValue = "";
  }
});
let events;
function connectEvents() {
  events?.close();
  events = new EventSource("/api/events");
  events.onopen = () => connection(true);
  events.onerror = () => {
    connection(false);
    if (!state)
      notice("Cannot reach the workspace. Reconnecting automatically…", true);
  };
  events.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      acceptState(payload.state, payload.actor);
      if ($("notice").textContent.startsWith("Cannot reach")) notice("");
      for (const [id, draft] of drafts)
        if (draft.dirty && !draft.conflict) scheduleSave(id);
    } catch (error) {
      console.error("Workspace update failed", error);
    }
  };
}
window.addEventListener("offline", () => {
  events?.close();
  connection(false);
});
window.addEventListener("online", connectEvents);
connectEvents();
