/** A readable device from a user agent, eg "Chrome on Linux". */
export function device(userAgent?: string | null) {
    if (!userAgent) return 'Unknown device';
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
                : 'Browser';
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
    return os ? `${browser} on ${os}` : browser;
}
