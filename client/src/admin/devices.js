/**
 * Players' devices in the back office (Moses, 20 Nov 2026; the server's src/devices): how one reads, and the
 * Players report's filter choices.
 */

/** "Phone · Android 14 · Chrome 131 · Android app", or '—'. */
export function deviceText(d, { client = true } = {}) {
  if (!d) return '—';
  const type = { phone: 'Phone', tablet: 'Tablet', computer: 'Computer' }[d.device] ?? d.device;
  return [type, d.os, d.browser, client ? d.clientLabel : null].filter(Boolean).join(' · ');
}

/** The filters: [key, label, options [[value, label]]]. */
export const DEVICE_FILTERS = [
  ['device', 'Device', [['phone', 'Phone'], ['tablet', 'Tablet'], ['computer', 'Computer']]],
  ['client', 'App or web', [['android-app', 'Android app'], ['ios-app', 'iPhone app'], ['web', 'Website']]],
  ['os', 'System', [['Android', 'Android'], ['iOS', 'iOS'], ['iPadOS', 'iPadOS'], ['Windows', 'Windows'], ['macOS', 'macOS'], ['ChromeOS', 'ChromeOS'], ['Linux', 'Linux']]],
  ['browser', 'Browser', [['Chrome', 'Chrome'], ['Safari', 'Safari'], ['Firefox', 'Firefox'], ['Edge', 'Edge'], ['Samsung Internet', 'Samsung Internet'], ['Opera', 'Opera'], ['WebView', 'App (WebView)'], ['TikTok', 'TikTok'], ['Instagram', 'Instagram'], ['Facebook', 'Facebook']]],
];
