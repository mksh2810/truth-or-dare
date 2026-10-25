/**
 * Utility to detect in-app browsers (Instagram, WhatsApp, Facebook, Messenger)
 * where Google OAuth popup/redirect is blocked or degraded.
 */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';
  const inAppPatterns = [
    /FBAN/i,
    /FBAV/i,
    /Instagram/i,
    /WhatsApp/i,
    /Line/i,
    /MicroMessenger/i,
    /Snapchat/i,
  ];
  return inAppPatterns.some((pattern) => pattern.test(ua));
}

/**
 * Copies current URL to clipboard or triggers share sheet
 */
export async function copyOrShareCurrentUrl(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Truth or Dare (Chit Table)', url });
      return true;
    } catch {
      // Fallback to clipboard
    }
  }
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
