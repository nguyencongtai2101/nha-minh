// Nhà mình: gọi video nhóm bằng Jitsi.
import { CFG, $ } from "./lib.js";

let jitsi = null;
function loadJitsiScript() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  return new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = `https://${CFG.jitsiDomain}/external_api.js`; s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  });
}

export async function openCall(roomName, displayName, onEnd) {
  await loadJitsiScript();
  jitsi = new window.JitsiMeetExternalAPI(CFG.jitsiDomain, {
    roomName, parentNode: $("jitsi"), width: "100%", height: "100%",
    userInfo: { displayName },
    configOverwrite: {
      prejoinConfig: { enabled: false }, prejoinPageEnabled: false,
      disableDeepLinking: true, startWithAudioMuted: false, startWithVideoMuted: false,
      defaultLanguage: "vi", disableInviteFunctions: true, enableWelcomePage: false,
      toolbarButtons: ["microphone", "camera", "toggle-camera", "tileview", "hangup"],
    },
    interfaceConfigOverwrite: { MOBILE_APP_PROMO: false, SHOW_JITSI_WATERMARK: false },
  });
  jitsi.addListener("readyToClose", onEnd);
  jitsi.addListener("videoConferenceLeft", onEnd);
}

// iPhone: gọi video trong khung nhúng hay bị mất hình/tiếng, nên mở thẳng trang gọi.
export function callPageUrl(roomName, displayName) {
  const q = (v) => encodeURIComponent(JSON.stringify(v));
  return `https://${CFG.jitsiDomain}/${encodeURIComponent(roomName)}#config.prejoinConfig.enabled=false&config.prejoinPageEnabled=false` +
    `&config.disableDeepLinking=true&config.startWithAudioMuted=false&config.startWithVideoMuted=false` +
    `&config.defaultLanguage=${q("vi")}&userInfo.displayName=${q(displayName)}`;
}

export function closeCall() {
  if (jitsi) { try { jitsi.executeCommand("hangup"); } catch {} try { jitsi.dispose(); } catch {} jitsi = null; }
  $("jitsi").innerHTML = "";
}
