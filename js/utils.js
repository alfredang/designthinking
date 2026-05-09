export function genId(len = 8) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

export function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function relativeTime(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function toast(msg, ms = 2200) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, ms);
}

export function getOrCreateUser() {
  let uid = localStorage.getItem("dt_uid");
  if (!uid) {
    uid = "u_" + genId(10);
    localStorage.setItem("dt_uid", uid);
  }
  const name = localStorage.getItem("dt_name") || "";
  return { uid, name };
}

export function setUserName(name) {
  localStorage.setItem("dt_name", name);
}

export function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

const NOTE_COLORS = ["", "color-pink", "color-blue", "color-green", "color-purple"];
export function colorForId(id) {
  if (!id) return "";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return NOTE_COLORS[h % NOTE_COLORS.length];
}

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function on(el, evt, handler) { el.addEventListener(evt, handler); }

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
