const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/**
 * Fetches a page as text with a browser-like User-Agent and a timeout.
 */
export async function fetchText(url: string, timeoutMs = 30_000): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'cs,en;q=0.8' },
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${url}`);
        }
        return await response.text();
    } finally {
        clearTimeout(timer);
    }
}
