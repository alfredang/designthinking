import {
  db, doc, setDoc, getDoc, onSnapshot, collection, serverTimestamp, deleteDoc
} from "./firebase-config.js";
import { genId, $, on, toast, initials, escapeHtml } from "./utils.js";

let presenceUnsub = null;
let heartbeatTimer = null;
let currentWsId = null;
let currentUser = null;

export async function createWorkspace(user) {
  const id = genId(8);
  if (db) {
    try {
      await setDoc(doc(db, "workspaces", id), {
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
    } catch (e) {
      console.warn("createWorkspace error:", e);
      toast("Couldn't save workspace — check Firebase config");
    }
  }
  return id;
}

export async function workspaceExists(id) {
  if (!db) return true; // can't verify; allow client-side
  try {
    const snap = await getDoc(doc(db, "workspaces", id));
    return snap.exists();
  } catch (e) {
    return true;
  }
}

export function joinPresence(wsId, user) {
  leavePresence();
  currentWsId = wsId;
  currentUser = user;
  if (!db) { renderPresence([{ uid: user.uid, name: user.name }]); return; }

  const ref = doc(db, "workspaces", wsId, "presence", user.uid);
  const beat = () => setDoc(ref, { name: user.name, lastSeen: Date.now() }).catch(() => {});
  beat();
  heartbeatTimer = setInterval(beat, 20000);

  presenceUnsub = onSnapshot(collection(db, "workspaces", wsId, "presence"), snap => {
    const cutoff = Date.now() - 60000;
    const active = snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(p => p.lastSeen && p.lastSeen > cutoff);
    renderPresence(active);
  });

  window.addEventListener("beforeunload", () => leavePresence(true), { once: true });
}

export function leavePresence(removeDoc = false) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  if (presenceUnsub) presenceUnsub();
  presenceUnsub = null;
  if (removeDoc && db && currentWsId && currentUser) {
    deleteDoc(doc(db, "workspaces", currentWsId, "presence", currentUser.uid)).catch(() => {});
  }
}

function renderPresence(users) {
  const bar = $("#presence-bar");
  if (!bar) return;
  if (!users.length) { bar.hidden = true; bar.innerHTML = ""; return; }
  bar.hidden = false;
  const visible = users.slice(0, 5);
  const extra = users.length - visible.length;
  bar.innerHTML = visible.map(u =>
    `<span class="avatar" title="${escapeHtml(u.name || 'Anonymous')}">${initials(u.name)}</span>`
  ).join("") + `<span class="presence-count">${users.length} online${extra > 0 ? ` (+${extra})` : ''}</span>`;
}

export function showShareModal(wsId) {
  const url = buildShareUrl(wsId);
  $("#share-link").value = url;
  $("#share-code").textContent = wsId;

  const qrBox = $("#qr-container");
  qrBox.innerHTML = "";
  if (window.QRCode) {
    new QRCode(qrBox, {
      text: url,
      width: 200,
      height: 200,
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    qrBox.textContent = "QR library not loaded";
  }

  $("#share-modal").hidden = false;
}

export function buildShareUrl(wsId) {
  const base = window.location.origin + window.location.pathname;
  return `${base}#/w/${wsId}`;
}

export function bindShareUI() {
  on($("#share-btn"), "click", () => {
    if (currentWsId) showShareModal(currentWsId);
  });
  on($("#copy-link-btn"), "click", async () => {
    const link = $("#share-link").value;
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copied");
    } catch {
      $("#share-link").select();
      document.execCommand("copy");
      toast("Link copied");
    }
  });
  document.querySelectorAll('[data-close="share-modal"]').forEach(b =>
    b.addEventListener("click", () => $("#share-modal").hidden = true));
  $("#share-modal").addEventListener("click", e => {
    if (e.target.id === "share-modal") $("#share-modal").hidden = true;
  });
}
