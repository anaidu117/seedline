import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; remove: (id: string) => void };
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<void> | null = null;

/** Loads Cloudflare Turnstile only on pages that need it. The only third-party script in Seedline. */
function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading = null; reject(new Error('The bot check could not load.')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export function Turnstile({ onToken, onError }: { onToken: (t: string) => void; onError?: (msg: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id: string | undefined;
    load().then(() => {
      if (!ref.current || !window.turnstile) return;
      id = window.turnstile.render(ref.current, {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => onError?.('The bot check failed. Reload the page and try again.'),
      });
    }).catch((e) => onError?.(e.message));
    return () => { if (id && window.turnstile) window.turnstile.remove(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={ref} data-third-party="turnstile" className="min-h-[65px]" />;
}
