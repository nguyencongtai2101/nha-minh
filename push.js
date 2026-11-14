// Nhà mình: thông báo đẩy (hiện cả khi web đang đóng).
import { CFG, toast } from "./lib.js";

const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function keyBytes(s) {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
async function hashId(s) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(h.slice(0, 16), (x) => x.toString(16).padStart(2, "0")).join("");
}

async function saveSub(code, me, sub) {
  const j = sub.toJSON();
  const V = "10.12.2";
  const fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const db = fs.getFirestore();
  await fs.setDoc(fs.doc(db, "families", code, "subs", await hashId(j.endpoint)), {
    endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, uid: me.uid, name: me.name, ts: fs.serverTimestamp(),
  });
}

async function subscribe(code, me) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(CFG.vapidPublic) });
  await saveSub(code, me, sub);
}

function makeBox() {
  const box = document.createElement("div");
  box.className = "call-live";
  box.style.cssText = "background:#dbeafe;color:#1e3a8a;animation:none";
  document.getElementById("btn-call").after(box);
  return box;
}

// Gọi sau khi đã vào màn hình chính.
export async function setupPush(code, me) {
  if (!CFG.pushServer || !CFG.vapidPublic || !CFG.firebase?.apiKey) return;
  if (setupPush.box) setupPush.box.remove();
  if (isIOS && !standalone) {
    const box = (setupPush.box = makeBox());
    box.innerHTML = "<span>🔔 Muốn nhận thông báo trên iPhone: bấm nút Chia sẻ ⬆️ rồi chọn <b>Thêm vào MH chính</b>, sau đó mở Nhà mình từ màn hình chính.</span>";
    return;
  }
  if (!supported) return;
  if (Notification.permission === "granted") { subscribe(code, me).catch(() => {}); return; }
  if (Notification.permission === "denied") return;
  const box = (setupPush.box = makeBox());
  box.innerHTML = "<span>🔔 Bật thông báo để biết khi có người gọi hoặc nhắn tin</span>";
  const btn = document.createElement("button");
  btn.className = "btn btn-green btn-small"; btn.textContent = "Bật";
  btn.onclick = async () => {
    const p = await Notification.requestPermission();
    if (p !== "granted") { toast("Chưa bật được thông báo"); return; }
    try { await subscribe(code, me); box.remove(); toast("Đã bật thông báo 🔔"); }
    catch (e) { console.error(e); toast("Bật thông báo bị lỗi, thử lại nhé"); }
  };
  box.appendChild(btn);
}

// Báo cho cả nhà (trừ mình).
export function notifyFamily(code, me, title, body, kind) {
  if (!CFG.pushServer) return;
  fetch(CFG.pushServer + "/notify", {
    method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
    body: JSON.stringify({ fam: code, uid: me.uid, title, body, kind }),
  }).catch(() => {});
}
