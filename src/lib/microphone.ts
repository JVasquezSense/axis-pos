/**
 * Permiso de micrófono.
 *
 * El navegador no deja "conceder para siempre" desde código: lo decide el
 * usuario en el diálogo del navegador. Lo que sí podemos hacer es pedirlo una
 * sola vez con getUserMedia (el diálogo de Chrome/Edge/Android ofrece
 * recordar la elección para este sitio) y, a partir de ahí, arrancar el
 * dictado sin volver a preguntar. Si lo negó, explicamos cómo reactivarlo.
 */

export type MicState = "granted" | "denied" | "prompt" | "unsupported";

const KEY = "axis-mic-granted";

export async function micPermissionState(): Promise<MicState> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (perms?.query) {
      const st = await perms.query({ name: "microphone" as PermissionName });
      if (st.state === "granted") return "granted";
      if (st.state === "denied") return "denied";
      return "prompt";
    }
  } catch {
    /* Safari no expone "microphone" en Permissions API */
  }
  try {
    return localStorage.getItem(KEY) === "1" ? "granted" : "prompt";
  } catch {
    return "prompt";
  }
}

/**
 * Pide el micrófono (abre el diálogo del navegador la primera vez) y lo
 * suelta enseguida: solo queremos la autorización, el audio lo toma la Web
 * Speech API. Devuelve true si quedó permitido.
 */
export async function requestMicrophone(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    try { localStorage.setItem(KEY, "1"); } catch { /* sin storage */ }
    return true;
  } catch {
    try { localStorage.removeItem(KEY); } catch { /* sin storage */ }
    return false;
  }
}

/** Cómo volver a permitirlo, según el navegador. */
export function micHelpText(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "En iPhone el dictado no está disponible en Safari; usa Chrome en Android o un computador.";
  if (/Android/.test(ua)) return "Toca el candado junto a la dirección → Permisos → Micrófono → Permitir. Elige \"Mientras uses el sitio\" para no volver a responder.";
  return "Haz clic en el candado junto a la dirección → Micrófono → Permitir. Chrome recuerda la elección para este sitio.";
}
