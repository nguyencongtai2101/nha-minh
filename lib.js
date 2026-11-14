// Nhà mình: các hàm dùng chung (lưu tin nhắn, mã gia đình, tiện ích).
export const CFG = window.NHA_MINH_CONFIG || {};
export const $ = (id) => document.getElementById(id);
export const EMOJIS = ["👩", "👨", "👵", "👴", "👧", "👦", "🧑", "👶", "🐶", "🐱", "🌸", "⭐", "🍀", "☀️", "❤️"];
export const CALL_FRESH_MIN = 60; // cuộc gọi trong 60 phút gần nhất coi là "đang gọi"

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

// ---------- Mã gia đình (nằm trong link mời) ----------
export function readFamilyCode() {
  const m = location.hash.match(/nha=([A-Za-z0-9]{16,64})/);
  if (m) { store.set("nha", m[1]); return m[1]; }
  return store.get("nha");
}
export function newCode() {
  const a = new Uint8Array(15); crypto.getRandomValues(a);
  const abc = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(a, (b) => abc[b % abc.length]).join("") + Date.now().toString(36);
}
export const inviteLink = (code) => `${location.origin}${location.pathname}#nha=${code}`;

// ---------- Nơi lưu tin nhắn ----------
export const hasFirebase = !!(CFG.firebase && CFG.firebase.apiKey);

export async function makeBackend(code, onMessages) {
  if (!hasFirebase) return makeDemoBackend(code, onMessages);
  const V = "10.12.2";
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const { getAuth, signInAnonymously } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
  const fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const app = initializeApp(CFG.firebase);
  await signInAnonymously(getAuth(app));
  const db = fs.getFirestore(app);
  const col = fs.collection(db, "families", code, "messages");
  const q = fs.query(col, fs.orderBy("ts", "desc"), fs.limit(300));
  fs.onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => {
      const x = d.data();
      return { id: d.id, ...x, ts: x.ts ? x.ts.toMillis() : Date.now() };
    }).reverse();
    onMessages(list);
  }, (err) => toast("Lỗi kết nối: " + err.code));
  return { send: (m) => fs.addDoc(col, { ...m, ts: fs.serverTimestamp() }) };
}

export function makeDemoBackend(code, onMessages) {
  const key = "demo-msgs-" + code;
  const ch = "BroadcastChannel" in window ? new BroadcastChannel(key) : null;
  const load = () => { try { return JSON.parse(store.get(key) || "[]"); } catch { return []; } };
  const emit = () => onMessages(load());
  if (ch) ch.onmessage = emit;
  window.addEventListener("storage", (e) => { if (e.key === key) emit(); });
  setTimeout(emit, 0);
  return {
    async send(m) {
      const list = load(); list.push({ ...m, id: String(Date.now()), ts: Date.now() });
      store.set(key, JSON.stringify(list.slice(-300))); emit(); ch && ch.postMessage(1);
    },
  };
}

// ---------- Giao diện ----------

export function toast(t) {
  const el = $("toast"); el.textContent = t; el.classList.remove("hidden");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.add("hidden"), 2600);
}
export const pad = (n) => String(n).padStart(2, "0");
export const hhmm = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export function dayLabel(t) {
  const d = new Date(t), now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Hôm nay";
  if (d.toDateString() === y.toDateString()) return "Hôm qua";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

