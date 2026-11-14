// Nhà mình: nhắn tin + gọi video cho gia đình.
import { CFG, $, EMOJIS, CALL_FRESH_MIN, store, readFamilyCode, newCode, inviteLink, hasFirebase, makeBackend, toast } from "./lib.js";
import { renderList } from "./render.js";
import { openCall, closeCall, callPageUrl } from "./call.js";
import { setupPush, notifyFamily } from "./push.js";

// ---------- Giao diện ----------
let me = null, code = null, backend = null, messages = [], firstLoad = true;

function show(id) {
  for (const s of document.querySelectorAll(".screen")) s.classList.toggle("hidden", s.id !== id);
}

function renderMessages() {
  renderList($("msgs"), messages, me.uid, firstLoad, () => startCall(false));
  renderCallLive();
}

function renderCallLive() {
  const last = [...messages].reverse().find((m) => m.type === "call");
  const fresh = last && Date.now() - last.ts < CALL_FRESH_MIN * 60000 && last.uid !== me.uid;
  $("call-live").classList.toggle("hidden", !fresh);
  if (fresh) $("call-live-text").textContent = `📞 ${last.name} đang gọi cả nhà`;
}

function onMessages(list) {
  const prevIds = new Set(messages.map((m) => m.id));
  messages = list;
  if (!firstLoad) {
    const fresh = list.filter((m) => !prevIds.has(m.id) && m.uid !== me.uid);
    if (fresh.some((m) => m.type === "call")) { navigator.vibrate && navigator.vibrate([400, 200, 400, 200, 400]); }
    else if (fresh.length) { navigator.vibrate && navigator.vibrate(150); }
    if (fresh.length && document.hidden) document.title = `(${fresh.length}) Nhà mình`;
  }
  renderMessages();
  firstLoad = false;
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) document.title = CFG.tenNha || "Nhà mình"; });

// ---------- Gọi video ----------
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
async function startCall(announce) {
  if (isIOS) {
    if (announce) {
      notifyFamily(code, me, "📞 Gọi cả nhà", `${me.name} đang gọi cả nhà, bấm vào để nghe`, "call");
      toast("Đang mở cuộc gọi...");
      await Promise.race([backend.send({ type: "call", uid: me.uid, name: me.name, emoji: me.emoji, text: "" }).catch(() => {}),
        new Promise((r) => setTimeout(r, 2500))]);
    }
    location.href = callPageUrl("NhaMinh" + code, `${me.emoji} ${me.name}`);
    return;
  }
  show("scr-call");
  if (announce) {
    backend.send({ type: "call", uid: me.uid, name: me.name, emoji: me.emoji, text: "" }).catch(() => {});
    notifyFamily(code, me, "📞 Gọi cả nhà", `${me.name} đang gọi cả nhà, bấm vào để nghe`, "call");
  }
  try { await openCall("NhaMinh" + code, `${me.emoji} ${me.name}`, endCall); }
  catch { toast("Không mở được cuộc gọi, kiểm tra mạng nhé"); endCall(); }
}
function endCall() { closeCall(); show("scr-main"); }

// ---------- Tên & hình đại diện ----------
let pickedEmoji = EMOJIS[0];
function showNameScreen() {
  $("inp-name").value = me ? me.name : "";
  pickedEmoji = me ? me.emoji : EMOJIS[0];
  const box = $("emoji-pick"); box.innerHTML = "";
  for (const e of EMOJIS) {
    const b = document.createElement("button"); b.type = "button"; b.textContent = e;
    if (e === pickedEmoji) b.classList.add("sel");
    b.onclick = () => { pickedEmoji = e; for (const x of box.children) x.classList.toggle("sel", x === b); };
    box.appendChild(b);
  }
  show("scr-name");
}
$("btn-save-name").onclick = () => {
  const name = $("inp-name").value.trim();
  if (!name) { toast("Nhập tên của bạn nhé"); return; }
  me = { uid: (me && me.uid) || newCode(), name, emoji: pickedEmoji };
  store.set("me", JSON.stringify(me));
  enterMain();
};

// ---------- Màn hình chính ----------
async function enterMain() {
  show("scr-main");
  keepInUrl();
  $("home-name").textContent = CFG.tenNha || "Nhà mình";
  $("demo-banner").classList.toggle("hidden", hasFirebase);
  if (!backend) {
    try { backend = await makeBackend(code, onMessages); setupPush(code, me); }
    catch (e) { console.error(e); toast("Không kết nối được, thử tải lại trang"); }
  } else { renderMessages(); setupPush(code, me); }
}

$("send-form").onsubmit = (e) => {
  e.preventDefault();
  const t = $("inp-msg").value.trim();
  if (!t || !backend) return;
  backend.send({ type: "text", uid: me.uid, name: me.name, emoji: me.emoji, text: t.slice(0, 1500) })
    .then(() => notifyFamily(code, me, `${me.emoji} ${me.name}`, t.slice(0, 200), "text"))
    .catch(() => toast("Chưa gửi được, thử lại nhé"));
  $("inp-msg").value = ""; autosize();
};
const autosize = () => { const t = $("inp-msg"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; };
$("inp-msg").addEventListener("input", autosize);
$("inp-msg").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); $("send-form").requestSubmit(); }
});

$("btn-call").onclick = () => startCall(true);
$("btn-join-live").onclick = () => startCall(false);
$("btn-hangup").onclick = endCall;

$("btn-menu").onclick = () => { $("invite-link").textContent = inviteLink(code); $("menu").classList.remove("hidden"); };
$("btn-close-menu").onclick = () => $("menu").classList.add("hidden");
$("btn-rename").onclick = () => { $("menu").classList.add("hidden"); showNameScreen(); };
$("btn-share").onclick = async () => {
  const url = inviteLink(code);
  const text = "Vào nhóm gọi video + nhắn tin của nhà mình nhé:";
  if (navigator.share) { try { await navigator.share({ title: "Nhà mình", text, url }); return; } catch {} }
  try { await navigator.clipboard.writeText(url); toast("Đã chép link, dán vào Zalo gửi cả nhà nhé"); }
  catch { toast("Bấm giữ vào link ở trên để chép"); }
};

$("btn-create").onclick = () => {
  if (!confirm("Chỉ tạo nhóm mới nếu nhà mình CHƯA có nhóm. Nếu người nhà đã gửi link thì bấm vào link đó. Vẫn tạo nhóm mới?")) return;
  code = newCode(); store.set("nha", code); showNameScreen();
};

// ---------- Giữ mã nhà + tên trong đường link ----------
// iPhone: "Thêm vào MH chính" lưu riêng, nên ghi sẵn mã nhà và tên vào link để app trên màn hình chính nhớ được.
const isIOSBrowser = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(matchMedia("(display-mode: standalone)").matches || navigator.standalone === true);
function keepInUrl() {
  if (!code) return;
  let h = "#nha=" + code;
  if (me && isIOSBrowser) h += "&ai=" + encodeURIComponent(JSON.stringify(me));
  history.replaceState(null, "", location.pathname + h);
}
function meFromUrl() {
  const m = location.hash.match(/[#&]ai=([^&]+)/);
  if (!m) return null;
  try {
    const x = JSON.parse(decodeURIComponent(m[1]));
    if (!x || !x.uid || !x.name) return null;
    return { uid: String(x.uid).slice(0, 40), name: String(x.name).slice(0, 20), emoji: String(x.emoji || EMOJIS[0]).slice(0, 8) };
  } catch { return null; }
}
// Nhóm lỡ tạo trùng thì chuyển về nhóm chính (mã nhóm chính được mã hoá bằng mã nhóm cũ).
async function movedTo(c) {
  const map = CFG.chuyenNha;
  if (!map || !crypto.subtle) return c;
  const sha = async (s) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const id = Array.from(await sha("id:" + c), (x) => x.toString(16).padStart(2, "0")).join("").slice(0, 20);
  const v = map[id];
  if (!v) return c;
  const k = await sha("key:" + c);
  const out = String.fromCharCode(...v.match(/../g).map((h, i) => parseInt(h, 16) ^ k[i]));
  if (!/^[A-Za-z0-9]{16,64}$/.test(out)) return c;
  store.set("nha", out);
  return out;
}

// ---------- Khởi động ----------
(async () => {
  code = readFamilyCode();
  try { me = JSON.parse(store.get("me") || "null"); } catch { me = null; }
  if (!me) { me = meFromUrl(); if (me) store.set("me", JSON.stringify(me)); }
  if (code) { try { code = await movedTo(code); } catch {} }
  if (!code) show("scr-join");
  else if (!me) showNameScreen();
  else enterMain();
})();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
