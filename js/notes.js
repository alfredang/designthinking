import {
  db, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, serverTimestamp, runTransaction
} from "./firebase-config.js";
import { escapeHtml, relativeTime, colorForId, $, on, toast } from "./utils.js";

let currentWorkspaceId = null;
let currentStageId = null;
let unsubscribe = null;
let allNotes = [];        // notes for current stage
let user = null;          // { uid, name }
let sectionConfigs = {};  // { sectionId: { voting, resolvable } }

// Note editor state
let editingId = null;
let editingStage = null;
let editingSection = null;

export function initNotes(opts) {
  user = opts.user;
  bindEditor();
}

export function setCurrentWorkspace(wsId) {
  currentWorkspaceId = wsId;
}

export function subscribeStage(stageId, onChange) {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  currentStageId = stageId;
  allNotes = [];
  if (!db || !currentWorkspaceId) return;
  const q = query(
    collection(db, "workspaces", currentWorkspaceId, "notes"),
    where("stage", "==", stageId)
  );
  unsubscribe = onSnapshot(q, snap => {
    allNotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onChange();
  }, err => {
    console.warn("notes subscription error:", err);
    toast("Failed to sync notes");
  });
}

export function renderSection(grid, stageId, sectionId, config) {
  sectionConfigs[sectionId] = config || {};
  grid.dataset.section = sectionId;
  grid.dataset.stage = stageId;

  const renderAll = () => {
    grid.innerHTML = "";
    const notes = allNotes
      .filter(n => n.section === sectionId)
      .sort((a, b) => {
        if ((b.voteCount || 0) !== (a.voteCount || 0)) return (b.voteCount || 0) - (a.voteCount || 0);
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
    notes.forEach(n => grid.appendChild(noteCard(n, config)));
    grid.appendChild(addButton(stageId, sectionId));
  };

  // Re-render whenever stage notes change
  grid._render = renderAll;
  renderAll();
}

export function rerenderAll(root) {
  root.querySelectorAll(".notes-grid").forEach(g => { if (g._render) g._render(); });
}

function addButton(stageId, sectionId) {
  const btn = document.createElement("button");
  btn.className = "add-note-btn";
  btn.innerHTML = "+ Add note";
  on(btn, "click", () => openEditor(stageId, sectionId, null));
  return btn;
}

function noteCard(n, config) {
  const el = document.createElement("div");
  el.className = "note " + colorForId(n.id);
  if (n.resolved) el.classList.add("resolved");

  const isMine = n.authorUid === user.uid;
  const voted = n.votes && n.votes[user.uid];

  const titleHtml = n.title ? `<div class="note-title">${escapeHtml(n.title)}</div>` : "";
  const bodyHtml = n.body ? `<div class="note-body">${escapeHtml(n.body)}</div>` : "";
  const catHtml = n.category ? `<span class="note-category">${escapeHtml(n.category)}</span>` : "";

  el.innerHTML = `
    ${titleHtml}
    ${bodyHtml}
    <div class="note-meta">
      <span class="note-author">${escapeHtml(n.author || "Anonymous")} · ${relativeTime(n.createdAt)}</span>
      ${catHtml}
    </div>
    <div class="note-actions">
      <button class="note-btn vote-btn ${voted ? 'voted' : ''}" title="Vote">▲ ${n.voteCount || 0}</button>
      ${config.resolvable ? `<button class="note-btn resolve-btn" title="Toggle resolved">${n.resolved ? '↺' : '✓'}</button>` : ''}
      ${isMine ? `<button class="note-btn edit-btn" title="Edit">✎</button>` : ''}
      ${isMine ? `<button class="note-btn delete-btn" title="Delete">🗑</button>` : ''}
    </div>
  `;

  el.querySelector(".vote-btn").addEventListener("click", () => toggleVote(n));
  const editBtn = el.querySelector(".edit-btn");
  if (editBtn) editBtn.addEventListener("click", () => openEditor(n.stage, n.section, n));
  const delBtn = el.querySelector(".delete-btn");
  if (delBtn) delBtn.addEventListener("click", () => removeNote(n));
  const resBtn = el.querySelector(".resolve-btn");
  if (resBtn) resBtn.addEventListener("click", () => toggleResolved(n));
  return el;
}

async function toggleVote(n) {
  if (!db || !currentWorkspaceId) return;
  const ref = doc(db, "workspaces", currentWorkspaceId, "notes", n.id);
  try {
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      const votes = { ...(data.votes || {}) };
      if (votes[user.uid]) delete votes[user.uid]; else votes[user.uid] = true;
      tx.update(ref, { votes, voteCount: Object.keys(votes).length });
    });
  } catch (e) { toast("Vote failed"); }
}

async function toggleResolved(n) {
  if (!db || !currentWorkspaceId) return;
  const ref = doc(db, "workspaces", currentWorkspaceId, "notes", n.id);
  try {
    await updateDoc(ref, { resolved: !n.resolved });
  } catch (e) { toast("Update failed"); }
}

async function removeNote(n) {
  if (!db || !currentWorkspaceId) return;
  if (!confirm("Delete this note?")) return;
  try {
    await deleteDoc(doc(db, "workspaces", currentWorkspaceId, "notes", n.id));
  } catch (e) { toast("Delete failed"); }
}

function openEditor(stageId, sectionId, existing) {
  editingStage = stageId;
  editingSection = sectionId;
  editingId = existing ? existing.id : null;

  $("#note-modal-title").textContent = existing ? "Edit note" : "Add note";
  $("#note-title").value = existing ? (existing.title || "") : "";
  $("#note-body").value = existing ? (existing.body || "") : "";
  $("#note-category").value = existing ? (existing.category || "") : "";
  $("#note-modal").hidden = false;
  setTimeout(() => $("#note-title").focus(), 50);
}

function closeEditor() {
  $("#note-modal").hidden = true;
  editingId = null;
  editingStage = null;
  editingSection = null;
}

function bindEditor() {
  on($("#note-cancel"), "click", closeEditor);
  on($("#note-save"), "click", saveNote);
  $("#note-modal").addEventListener("click", e => {
    if (e.target.id === "note-modal") closeEditor();
  });
  document.querySelectorAll('[data-close="note-modal"]').forEach(b =>
    b.addEventListener("click", closeEditor));
}

async function saveNote() {
  const title = $("#note-title").value.trim();
  const body = $("#note-body").value.trim();
  const category = $("#note-category").value.trim();
  if (!title && !body) { toast("Add a title or description"); return; }

  if (!db || !currentWorkspaceId) {
    toast("Firebase not configured");
    closeEditor();
    return;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, "workspaces", currentWorkspaceId, "notes", editingId), {
        title, body, category
      });
    } else {
      await addDoc(collection(db, "workspaces", currentWorkspaceId, "notes"), {
        stage: editingStage,
        section: editingSection,
        title, body, category,
        author: user.name || "Anonymous",
        authorUid: user.uid,
        createdAt: serverTimestamp(),
        votes: {},
        voteCount: 0,
        resolved: false
      });
    }
    closeEditor();
  } catch (e) {
    console.error(e);
    toast("Save failed");
  }
}
