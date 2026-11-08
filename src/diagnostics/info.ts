// What a bug report needs to be useful: which build, which device, which browser.
// Nothing here is personal, and nothing is sent anywhere unless the person
// chooses to (feedback email) or error reporting is switched on (monitoring.ts).

export const BUILD = {
  version: __APP_VERSION__,
  commit: __APP_COMMIT__,
  built: __APP_BUILT__,
};

export const buildLabel = () => `v${BUILD.version} (${BUILD.commit}, ${BUILD.built})`;

/** Browsers embedded in other apps (Instagram, Facebook, WhatsApp, ...) often refuse the microphone. */
export function inAppBrowser(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): string | null {
  const match = /(FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Snapchat|TikTok|BytedanceWebview|Twitter|LinkedInApp|Pinterest|GSA\/|WhatsApp|Telegram)/i.exec(ua);
  if (match) return match[1].replace(/FBAN|FBAV|FB_IAB/i, 'Facebook').replace(/Line\//i, 'Line').replace(/GSA\//, 'Google app');
  // Android WebViews say "wv"; iOS ones omit "Safari" from an otherwise-Apple user agent.
  if (/Android.*; wv\)/i.test(ua)) return 'an in-app browser';
  if (/iPhone|iPad|iPod/i.test(ua) && /AppleWebKit/i.test(ua) && !/Safari|CriOS|FxiOS|EdgiOS/i.test(ua)) return 'an in-app browser';
  return null;
}

export type BrowserFamily = 'ios-safari' | 'ios-chrome' | 'android-chrome' | 'chrome' | 'firefox' | 'safari' | 'edge' | 'other';

export function browserFamily(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): BrowserFamily {
  const ios = /iPhone|iPad|iPod/i.test(ua);
  if (ios && /CriOS/i.test(ua)) return 'ios-chrome';
  if (ios) return 'ios-safari';
  if (/Edg\//i.test(ua)) return 'edge';
  if (/Firefox|FxiOS/i.test(ua)) return 'firefox';
  if (/Android/i.test(ua) && /Chrome/i.test(ua)) return 'android-chrome';
  if (/Chrome/i.test(ua)) return 'chrome';
  if (/Safari/i.test(ua)) return 'safari';
  return 'other';
}

/** Where to look to unblock a denied microphone, in this browser's words. */
export function micHelp(family: BrowserFamily): string[] {
  switch (family) {
    case 'ios-safari':
      return ['Open Settings > Safari > Microphone and choose Ask or Allow.', 'Or tap the "aA" button in the address bar > Website Settings > Microphone > Allow.', 'Come back here and try again.'];
    case 'ios-chrome':
      return ['Open Settings > Chrome > Microphone and switch it on.', 'Come back here and try again.'];
    case 'android-chrome':
      return ['Tap the lock icon next to the address > Permissions > Microphone > Allow.', 'If it still says blocked: Settings > Apps > Chrome > Permissions > Microphone.', 'Come back here and try again.'];
    case 'firefox':
      return ['Click the microphone icon in the address bar, then the x next to "Blocked".', 'Reload the page and choose Allow.'];
    case 'safari':
      return ['Safari menu > Settings for this website > Microphone > Allow.', 'Reload the page and try again.'];
    default:
      return ['Click the lock icon next to the web address.', 'Set Microphone to Allow.', 'Come back here and try again.'];
  }
}

export interface DeviceSummary {
  build: string;
  browser: string;
  family: BrowserFamily;
  inApp: string | null;
  installed: boolean;
  viewport: string;
  online: boolean;
  page: string;
}

export function deviceSummary(): DeviceSummary {
  return {
    build: buildLabel(),
    browser: navigator.userAgent,
    family: browserFamily(),
    inApp: inAppBrowser(),
    installed: matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    viewport: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio || 1}`,
    online: navigator.onLine,
    // The path only: never the query string or hash, which can hold invite codes or auth tokens.
    page: location.pathname,
  };
}
