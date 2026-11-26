export type InAppBrowserName =
  | 'Instagram'
  | 'WhatsApp'
  | 'Facebook'
  | 'Snapchat'
  | 'TikTok'
  | 'In-App Browser';

export interface InAppBrowserInfo {
  isInApp: boolean;
  name: InAppBrowserName | null;
}

/**
 * Detects restricted in-app WebViews (Instagram, WhatsApp, Facebook, Snapchat, TikTok)
 * where PWA install, Web Share, or camera QR scanning may fail (B3).
 */
export function detectInAppBrowser(userAgent?: string): InAppBrowserInfo {
  const ua =
    userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  if (!ua) return { isInApp: false, name: null };

  if (/Instagram/i.test(ua)) {
    return { isInApp: true, name: 'Instagram' };
  }
  if (/WhatsApp/i.test(ua)) {
    return { isInApp: true, name: 'WhatsApp' };
  }
  if (/FBAN|FBAV|FB_IAB|Messenger/i.test(ua)) {
    return { isInApp: true, name: 'Facebook' };
  }
  if (/Snapchat/i.test(ua)) {
    return { isInApp: true, name: 'Snapchat' };
  }
  if (/BytedanceWebview|musical_ly|TikTok/i.test(ua)) {
    return { isInApp: true, name: 'TikTok' };
  }
  if (/\bwv\b|WebView/i.test(ua) && !/Chrome\/\d+/i.test(ua)) {
    return { isInApp: true, name: 'In-App Browser' };
  }

  return { isInApp: false, name: null };
}
