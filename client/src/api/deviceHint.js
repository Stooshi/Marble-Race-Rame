/**
 * Two coarse hints about the device, sent with logins, the app opening and race readiness reports (header
 * X-Client-Device; the server's src/devices, Moses 20 Nov 2026):
 *   osv=<major>  the system's major version where the browser no longer puts it in its user agent (Chrome's frozen
 *                "Android 10; K", and Windows 11, which says "Windows NT 10.0"); from navigator.userAgentData
 *   touch=1      a "Macintosh" with a touch screen: an iPad asking for the desktop site
 * Nothing else: no model, no screen size, nothing that tells one device from another of the same kind.
 */
let hint = '';

function touchMac() {
  try { return /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1; } catch { return false; }
}

function compose(osv) {
  const parts = [];
  if (osv) parts.push(`osv=${osv}`);
  if (touchMac()) parts.push('touch=1');
  hint = parts.join(';');
}

compose(0);
try {
  navigator.userAgentData?.getHighEntropyValues?.(['platformVersion'])
    .then((v) => { const major = Number.parseInt(String(v?.platformVersion ?? '').split('.')[0], 10); compose(Number.isFinite(major) && major > 0 && major < 1000 ? major : 0); })
    .catch(() => {});
} catch { /* not offered */ }

/** The header's value ('' when there is nothing to say). */
export const deviceHint = () => hint;

/** Whether a request to this API path carries it: logins and the app opening, and race readiness reports. */
export const wantsDeviceHint = (path) => /^\/auth\/(guest|register|claim|login|me)\b/.test(path) || /^\/races\/[^/]+\/readiness$/.test(path);
