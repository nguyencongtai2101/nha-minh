// Nhà mình: vẽ danh sách tin nhắn.
import { hhmm, dayLabel } from "./lib.js";

export function renderList(box, messages, myUid, firstLoad, onJoin) {
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  box.innerHTML = "";
  if (!messages.length) {
    box.innerHTML = `<div class="empty">Chưa có tin nhắn nào.<br>Hãy chào cả nhà một câu nhé 👋</div>`;
  }
  let lastDay = "";
  for (const m of messages) {
    const dl = dayLabel(m.ts);
    if (dl !== lastDay) {
      const d = document.createElement("div"); d.className = "day"; d.textContent = dl; box.appendChild(d); lastDay = dl;
    }
    const mine = m.uid === myUid;
    const row = document.createElement("div");
    row.className = "msg" + (mine ? " mine" : "") + (m.type === "call" ? " call" : "");
    const av = document.createElement("div"); av.className = "av"; av.textContent = m.emoji || "🙂";
    const b = document.createElement("div"); b.className = "bubble";
    const who = document.createElement("div"); who.className = "who"; who.textContent = m.name || "?";
    const body = document.createElement("div");
    if (m.type === "call") {
      body.textContent = `📞 ${mine ? "Bạn" : m.name} đã bắt đầu gọi cả nhà`;
      const jb = document.createElement("button"); jb.className = "btn btn-green btn-small"; jb.style.marginTop = "8px";
      jb.textContent = "Vào cuộc gọi"; jb.onclick = () => onJoin();
      body.appendChild(document.createElement("br")); body.appendChild(jb);
    } else body.textContent = m.text;
    const tm = document.createElement("div"); tm.className = "time"; tm.textContent = hhmm(m.ts);
    b.append(who, body, tm); row.append(av, b); box.appendChild(row);
  }
  if (atBottom || firstLoad) box.scrollTop = box.scrollHeight;
}

