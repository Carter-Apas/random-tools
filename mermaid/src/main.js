import { initMono } from "@random-tools/mono/browser";
import mermaid from "mermaid";

import { createDiagramViewport } from "./viewport";
import "./style.css";
import "@random-tools/mono/styles.css";

const configureDiagramTheme = () => {
  const palette = getComputedStyle(document.documentElement);
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    suppressErrorRendering: true,
    fontFamily: getComputedStyle(document.documentElement).getPropertyValue("--mono-font"),
    maxTextSize: 100_000,
    secure: ["secure", "securityLevel", "startOnLoad", "maxTextSize", "suppressErrorRendering"],
    themeCSS: `
      .node rect, .node polygon, .node circle, .node path, .cluster rect, rect.actor {
        stroke-width: 1px;
        vector-effect: non-scaling-stroke;
      }
      .node rect, .cluster rect, rect.actor {
        rx: ${palette.getPropertyValue("--mono-radius-md").trim()};
        ry: ${palette.getPropertyValue("--mono-radius-md").trim()};
      }
    `,
    themeVariables: {
      dropShadow: "none",
      primaryColor: palette.getPropertyValue("--mono-surface").trim(),
      primaryTextColor: palette.getPropertyValue("--mono-text").trim(),
      primaryBorderColor: palette.getPropertyValue("--mono-control-border").trim(),
      nodeBorder: palette.getPropertyValue("--mono-control-border").trim(),
      clusterBorder: palette.getPropertyValue("--mono-border").trim(),
      actorBorder: palette.getPropertyValue("--mono-control-border").trim(),
      lineColor: palette.getPropertyValue("--mono-muted").trim(),
      secondaryColor: palette.getPropertyValue("--mono-inset").trim(),
      tertiaryColor: palette.getPropertyValue("--mono-surface").trim(),
      edgeLabelBackground: palette.getPropertyValue("--mono-surface").trim(),
      fontSize: "14px",
    },
  });
};

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
const viewport = createDiagramViewport($("preview-scroll"), $("diagram"), ({ scale, fitted }) => {
  $("zoom-level").textContent = fitted ? "Fit" : `${Math.round(scale * 100)}%`;
});
let renderTimer;
let noticeTimer;
let dialogTab = null;

const activeTab = () => state?.tabs.find((tab) => tab.id === activeId);

const sourceFor = (id) =>
  drafts.get(id)?.source ?? state?.tabs.find((tab) => tab.id === id)?.source ?? "";

const dirty = () => [...drafts.values()].some((draft) => draft.dirty);

const notice = (message, persistent = false) => {
  clearTimeout(noticeTimer);
  $("notice").textContent = message;
  $("notice").hidden = !message;
  if (!persistent && message)
    noticeTimer = setTimeout(() => {
      $("notice").hidden = true;
    }, 7000);
};

const connection = (live) => {
  connected = live;
  $("connection").className = `connection ${live ? "live" : "offline"}`;
  $("connection-text").textContent = live ? "Live with everyone" : "Reconnecting…";
  controls();
};

const controls = () => {
  const tab = activeTab();
  const draft = drafts.get(activeId);
  $("add-tab").disabled = !state || !connected || state.tabs.length >= 10;
  $("add-tab").title =
    state?.tabs.length >= 10 ? "Maximum of 10 tabs reached" : "Create a shared diagram";

  $("rename").disabled = !tab || !connected || !!draft?.dirty;
  for (const button of $("tabs").querySelectorAll("[role=tab]")) {
    const closable = connected && state.tabs.length > 1 && !drafts.get(button.dataset.id)?.dirty;
    button.dataset.closable = String(closable);
    button.querySelector("[data-close-tab]").title = closable
      ? "Close tab (Delete)"
      : state.tabs.length === 1
        ? "Keep at least one tab"
        : "Save changes before closing";
  }
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
};

const renderTabs = () => {
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
      const label = document.createElement("span");
      label.className = "tab-label";
      label.id = `tab-label-${tab.id}`;
      label.textContent = tab.name;
      button.setAttribute("aria-labelledby", label.id);
      button.setAttribute("aria-keyshortcuts", "Delete");
      const close = document.createElement("span");
      close.className = "tab-close";
      close.dataset.closeTab = "";
      close.setAttribute("aria-hidden", "true");
      close.innerHTML = '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>';
      button.append(label, close);
      button.addEventListener("click", (event) => {
        if (event.target.closest("[data-close-tab]")) openDelete(tab.id);
        else selectTab(tab.id);
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "Delete") {
          event.preventDefault();
          openDelete(tab.id);
          return;
        }
        const index = state.tabs.findIndex((item) => item.id === tab.id);
        let target;
        if (event.key === "ArrowRight") target = state.tabs[(index + 1) % state.tabs.length];
        if (event.key === "ArrowLeft")
          target = state.tabs[(index - 1 + state.tabs.length) % state.tabs.length];
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
  if (activeTab()) $("workspace").setAttribute("aria-labelledby", `tab-${activeId}`);
  else $("workspace").removeAttribute("aria-labelledby");
  if (focusId)
    (
      document.getElementById(`tab-${focusId}`) ?? document.getElementById(`tab-${activeId}`)
    )?.focus({ preventScroll: true });
  controls();
};

const lineNumbers = () => {
  const count = $("source").value.split("\n").length;
  $("line-numbers").textContent = Array.from({ length: count }, (_, i) => i + 1).join("\n");
  $("line-numbers").scrollTop = $("source").scrollTop;
  $("line-count").textContent = `${count} ${count === 1 ? "line" : "lines"}`;
};

const selectTab = (id) => {
  const oldDraft = drafts.get(activeId);
  if (activeId !== id && oldDraft?.dirty && !activeTab()) {
    notice("Copy your draft first, then reload this page to return to the shared workspace.", true);
    return;
  }
  activeId = id;
  $("source").value = sourceFor(id);
  document.title = `${activeTab()?.name ?? "Draft"} · Mermaid`;
  renderedSvg = "";
  viewport.reset();
  $("download").disabled = true;
  $("diagram").replaceChildren();
  lineNumbers();
  renderTabs();
  scheduleRender(0);
};

const acceptState = (incoming, origin) => {
  if (state && incoming.id === state.id && incoming.version <= state.version) return;
  for (const [id, draft] of drafts) {
    const tab = incoming.tabs.find((item) => item.id === id);
    if (draft.dirty && (!tab || (tab.revision !== draft.revision && origin !== actor))) {
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
    if (!drafts.get(activeId)?.dirty && $("source").value !== sourceFor(activeId)) {
      $("source").value = sourceFor(activeId);
      lineNumbers();
      scheduleRender();
    }
  }
  $("workspace").setAttribute("aria-busy", "false");
};

const request = async (path, method, body) => {
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
};

const scheduleSave = (id, delay = 450) => {
  const draft = drafts.get(id);
  if (!draft) return;
  clearTimeout(draft.timer);
  if (connected && !draft.conflict && !draft.saving)
    draft.timer = setTimeout(() => save(id), delay);
};

const save = async (id) => {
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
      draft.conflict = state.tabs.find((tab) => tab.id === id)?.revision !== saved.revision;
      draft.saving = false;
      scheduleSave(id);
    }
    if (activeId === id && !drafts.has(id) && $("source").value !== sourceFor(id)) {
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
};

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

const scheduleRender = (delay = 250) => {
  clearTimeout(renderTimer);
  const version = ++renderVersion;
  const source = $("source").value;
  $("render-status").textContent = source.trim() ? "Rendering…" : "Ready for a diagram";
  $("download").disabled = true;
  renderTimer = setTimeout(() => renderDiagram(source, version), delay);
};

const renderDiagram = async (source, version) => {
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
    viewport.setSize(
      svg.viewBox.baseVal.width || parseFloat(svg.getAttribute("width")) || 600,
      svg.viewBox.baseVal.height || parseFloat(svg.getAttribute("height")) || 400,
    );
  } catch (error) {
    if (version !== renderVersion) return;
    $("render-error").hidden = false;
    $("error-text").textContent = String(error.message || error).slice(0, 1800);
    $("render-status").textContent = "Syntax needs attention";
    if (!renderedSvg)
      $("diagram").innerHTML =
        '<p class="empty-preview">Your preview will appear once the syntax is valid.</p>';
  }
};

$("zoom-in").addEventListener("click", () => viewport.zoomBy(1.2));
$("zoom-out").addEventListener("click", () => viewport.zoomBy(1 / 1.2));
$("fit").addEventListener("click", () => viewport.fit());
$("toggle-source").addEventListener("click", () => {
  const hidden = $("workspace").classList.toggle("source-hidden");
  $("toggle-source").textContent = hidden ? "Show source" : "Hide source";
  $("toggle-source").setAttribute("aria-pressed", String(hidden));
});
$("download").addEventListener("click", () => {
  if (!renderedSvg || $("download").disabled) return;
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([renderedSvg], { type: "image/svg+xml" }));
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

const openDelete = (id) => {
  const tab = state?.tabs.find((item) => item.id === id);
  if (!tab || !connected || state.tabs.length <= 1 || drafts.get(id)?.dirty) return;
  dialogTab = { ...tab };
  $("delete-description").textContent = `“${dialogTab.name}” will be permanently removed.`;
  $("delete-error").textContent = "";
  $("delete-dialog").showModal();
  $("cancel-delete").focus();
};

$("cancel-delete").addEventListener("click", () => $("delete-dialog").close());
$("delete-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("confirm-delete").disabled = true;
  try {
    await request(`/api/tabs/${dialogTab.id}`, "DELETE", {
      expectedRevision: dialogTab.revision,
    });
    $("delete-dialog").close();
    document.getElementById(`tab-${activeId}`)?.focus();
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

const connectEvents = () => {
  events?.close();
  events = new EventSource("/api/events");
  events.onopen = () => connection(true);
  events.onerror = () => {
    connection(false);
    if (!state) notice("Cannot reach the workspace. Reconnecting automatically…", true);
  };
  events.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      acceptState(payload.state, payload.actor);
      if ($("notice").textContent.startsWith("Cannot reach")) notice("");
      for (const [id, draft] of drafts) if (draft.dirty && !draft.conflict) scheduleSave(id);
    } catch (error) {
      console.error("Workspace update failed", error);
    }
  };
};

window.addEventListener("offline", () => {
  events?.close();
  connection(false);
});
window.addEventListener("online", connectEvents);
connectEvents();

initMono();

configureDiagramTheme();
window.addEventListener("mono-theme-change", () => {
  configureDiagramTheme();
  scheduleRender(0);
});
