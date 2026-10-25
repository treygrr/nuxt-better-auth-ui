import type { MessageKey, MessageParams } from '../i18n';

/**
 * A readable device from a user agent, eg "Chrome on Linux". With useAuthI18n's `t`, the connecting words are in
 * the visitor's language; English otherwise. Browser and OS names stay as they are.
 */
export function device(userAgent?: string | null, t?: (key: MessageKey, params?: MessageParams) => string) {
    if (!userAgent) return t?.('admin.device.unknown') ?? 'Unknown device';
    const browser = /Edg\//.test(userAgent)
        ? 'Edge'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Chrome\//.test(userAgent)
            ? 'Chrome'
            : /Safari\//.test(userAgent)
              ? 'Safari'
              : /curl\//.test(userAgent)
                ? 'curl'
                : (t?.('admin.device.browser') ?? 'Browser');
    // iOS before macOS: iPhone and iPad user agents say "like Mac OS X".
    const os = /Windows/.test(userAgent)
        ? 'Windows'
        : /iPhone|iPad/.test(userAgent)
          ? 'iOS'
          : /Mac OS X/.test(userAgent)
            ? 'macOS'
            : /Android/.test(userAgent)
              ? 'Android'
              : /Linux/.test(userAgent)
                ? 'Linux'
                : '';
    return os ? (t?.('admin.device.on', { browser, os }) ?? `${browser} on ${os}`) : browser;
}
