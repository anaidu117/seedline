// Email templates. Plain words, no em dashes, every email has an unsubscribe link.
const DISCLAIMER = 'Information only, not legal or investment advice. Always confirm details with the organizer.';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface Block { heading?: string; lines?: { text: string; href?: string }[]; buttons?: { label: string; href: string }[] }

export function render(opts: { preheader: string; title: string; blocks: Block[]; unsubscribeUrl: string; unsubscribeLabel: string }) {
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#13294b">
<span style="display:none">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #d5e0eb;border-radius:12px" cellpadding="0" cellspacing="0"><tr><td style="padding:24px">
<p style="margin:0 0 16px;font-weight:bold;font-size:18px">Seedline</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${esc(opts.title)}</h1>
${opts.blocks.map((b) => `
${b.heading ? `<h2 style="margin:20px 0 8px;font-size:17px">${esc(b.heading)}</h2>` : ''}
${(b.lines ?? []).map((l) => `<p style="margin:0 0 8px;line-height:1.5">${l.href ? `<a href="${esc(l.href)}" style="color:#1d6aa5">${esc(l.text)}</a>` : esc(l.text)}</p>`).join('')}
${(b.buttons ?? []).length ? `<p style="margin:12px 0">${b.buttons!.map((x) => `<a href="${esc(x.href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 18px;background:#4b9cd3;color:#13294b;text-decoration:none;border-radius:10px;font-weight:bold">${esc(x.label)}</a>`).join('')}</p>` : ''}`).join('')}
<p style="margin:24px 0 0;font-size:13px;color:#4a5d78">${esc(DISCLAIMER)}</p>
<p style="margin:8px 0 0;font-size:13px;color:#4a5d78"><a href="${esc(opts.unsubscribeUrl)}" style="color:#1d6aa5">${esc(opts.unsubscribeLabel)}</a></p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    'Seedline', '', opts.title, '',
    ...opts.blocks.flatMap((b) => [
      ...(b.heading ? [b.heading] : []),
      ...(b.lines ?? []).map((l) => (l.href ? `${l.text}: ${l.href}` : l.text)),
      ...(b.buttons ?? []).map((x) => `${x.label}: ${x.href}`),
      '',
    ]),
    DISCLAIMER, '', `${opts.unsubscribeLabel}: ${opts.unsubscribeUrl}`,
  ].join('\n');
  return { html, text };
}
