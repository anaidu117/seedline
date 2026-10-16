import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { callFunction } from '../lib/supabase.ts';
import { Alert, Loading, Page } from '../components/ui.tsx';

const NAMES: Record<string, string> = { digest: 'the weekly digest', reminder: 'deadline reminders', checkin: 'check-in emails', all: 'all Seedline emails' };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const [state, setState] = useState<{ kind?: string; error?: string } | null>(null);
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    callFunction<{ kind: string }>('unsubscribe', { token: params.get('t') ?? '' })
      .then((r) => setState({ kind: r.kind })).catch((e) => setState({ error: e.message }));
  }, [params]);
  return (
    <Page narrow>
      {!state ? <Loading label="Unsubscribing" /> : state.error ? <Alert tone="error">{state.error}</Alert> : (
        <Alert tone="success">You're unsubscribed from {NAMES[state.kind!] ?? 'these emails'}. You can turn emails back on from your profile.</Alert>
      )}
      <Link className="btn btn-secondary mt-4" to="/profile#email">Email settings</Link>
    </Page>
  );
}
