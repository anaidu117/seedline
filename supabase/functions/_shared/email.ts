// Sends email through Resend. Locally, with no RESEND_API_KEY, it sends to the Mailpit test inbox instead.
export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** One-click unsubscribe (RFC 8058). */
  unsubscribeUrl?: string;
}

export async function sendEmail(e: Email): Promise<{ id: string }> {
  const from = Deno.env.get('EMAIL_FROM') ?? 'Seedline <hello@example.com>';
  const headers: Record<string, string> = {};
  if (e.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${e.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [e.to], subject: e.subject, html: e.html, text: e.text, headers }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return await res.json();
  }
  const local = Deno.env.get('LOCAL_MAIL_API');
  if (!local) throw new Error('No RESEND_API_KEY is set, so email cannot be sent.');
  const m = from.match(/^(.*)<(.+)>$/);
  const res = await fetch(local, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      From: { Email: m ? m[2].trim() : from, Name: m ? m[1].trim() : '' },
      To: [{ Email: e.to }], Subject: e.subject, HTML: e.html, Text: e.text, Headers: headers,
    }),
  });
  if (!res.ok) throw new Error(`Local mail ${res.status}: ${await res.text()}`);
  const body = await res.json();
  return { id: body.ID };
}
