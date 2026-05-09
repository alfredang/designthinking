import { isConfigured } from "./firebase-config.js";
import { $, on, toast, getOrCreateUser, setUserName } from "./utils.js";
import { STAGES, renderStepper, renderStagePanel } from "./stages.js";
import {
  initNotes, setCurrentWorkspace, subscribeStage, renderSection, rerenderAll
} from "./notes.js";
import {
  createWorkspace, workspaceExists, joinPresence, leavePresence,
  showShareModal, bindShareUI
} from "./workspace.js";

const state = {
  view: "landing",
  workspaceId: null,
  stageId: STAGES[0].id,
  user: getOrCreateUser()
};

function init() {
  initTheme();
  bindLanding();
  bindShareUI();
  bindNameModal();
  bindBrand();
  initNotes({ user: state.user });

  if (!isConfigured) {
    setTimeout(() => toast("Firebase not configured — paste your config in js/firebase-config.js"), 600);
  }

  window.addEventListener("hashchange", route);
  route();
}

function route() {
  const hash = window.location.hash || "";
  const m = hash.match(/^#\/w\/([a-z0-9]+)$/i);
  if (m) {
    enterWorkspace(m[1]);
  } else {
    showLanding();
  }
}

function showLanding() {
  state.view = "landing";
  state.workspaceId = null;
  leavePresence();
  $("#landing-view").hidden = false;
  $("#workspace-view").hidden = true;
  $("#share-btn").hidden = true;
  $("#presence-bar").hidden = true;
}

async function enterWorkspace(wsId) {
  // Ensure user has a name
  if (!state.user.name) {
    const name = await promptName();
    if (!name) { window.location.hash = ""; return; }
    state.user.name = name;
  }

  // Verify (or accept) workspace
  const exists = await workspaceExists(wsId);
  if (!exists) {
    toast("Workspace not found");
    window.location.hash = "";
    return;
  }

  state.view = "workspace";
  state.workspaceId = wsId;
  setCurrentWorkspace(wsId);

  $("#landing-view").hidden = true;
  $("#workspace-view").hidden = false;
  $("#share-btn").hidden = false;

  joinPresence(wsId, state.user);
  renderWorkspace();
}

function renderWorkspace() {
  renderStepper($("#stepper"), state.stageId, id => {
    state.stageId = id;
    renderWorkspace();
  });

  renderStagePanel($("#stage-panel"), state.stageId, (grid, stageId, sectionId, cfg) => {
    renderSection(grid, stageId, sectionId, cfg);
  });

  subscribeStage(state.stageId, () => {
    rerenderAll($("#stage-panel"));
  });
}

function bindLanding() {
  on($("#create-ws-btn"), "click", async () => {
    const name = state.user.name || await promptName();
    if (!name) return;
    state.user.name = name;
    const id = await createWorkspace(state.user);
    window.location.hash = `#/w/${id}`;
    setTimeout(() => showShareModal(id), 400);
  });

  on($("#join-ws-btn"), "click", () => {
    const code = $("#join-code-input").value.trim().toLowerCase();
    if (!code) { toast("Enter a workspace code"); return; }
    window.location.hash = `#/w/${code}`;
  });

  on($("#join-code-input"), "keydown", e => {
    if (e.key === "Enter") $("#join-ws-btn").click();
  });
}

function bindBrand() {
  on($("#brand"), "click", () => { window.location.hash = ""; });
}

/* ---- name modal ---- */
let pendingNameResolve = null;
function bindNameModal() {
  on($("#name-submit"), "click", () => {
    const v = $("#name-input").value.trim();
    if (!v) { toast("Please enter a name"); return; }
    setUserName(v);
    state.user.name = v;
    $("#name-modal").hidden = true;
    if (pendingNameResolve) { pendingNameResolve(v); pendingNameResolve = null; }
  });
  on($("#name-input"), "keydown", e => {
    if (e.key === "Enter") $("#name-submit").click();
  });
}
function promptName() {
  return new Promise(resolve => {
    pendingNameResolve = resolve;
    $("#name-input").value = state.user.name || "";
    $("#name-modal").hidden = false;
    setTimeout(() => $("#name-input").focus(), 50);
  });
}

/* ---- theme ---- */
function initTheme() {
  const saved = localStorage.getItem("dt_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
  on($("#theme-toggle"), "click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("dt_theme", next);
    updateThemeIcon(next);
  });
}
function updateThemeIcon(theme) {
  const el = $("#theme-toggle .theme-icon");
  if (el) el.textContent = theme === "dark" ? "☀️" : "🌙";
}

init();
