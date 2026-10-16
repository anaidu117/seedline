import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { callFunction } from '../lib/supabase.ts';
import { Alert, Loading, Page } from '../components/ui.tsx';

interface Result { ok: true; status: string; message: string; amountToken?: string }

/** Landing page for check-in links in emails. Posts the token once, on load; no sign-in needed. */
export default function Checkin() {
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [amountMsg, setAmountMsg] = useState('');
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return; // React dev mode runs effects twice; the link must be used once.
    sent.current = true;
    if (!token) { setError('This link is missing its code. Open it again from the email.'); return; }
    callFunction<Result>('checkin', { token }).then(setResult).catch((e) => setError(e.message));
  }, [token]);

  async function saveAmount(e: FormEvent) {
    e.preventDefault();
    const v = amount.replace(/[$,\s]/g, '');
    if (v && !/^\d+$/.test(v)) { setAmountMsg('Enter whole dollars, for example 5000.'); return; }
    try {
      const r = await callFunction<{ message: string }>('checkin', { token: result!.amountToken, amount: v ? Number(v) : null });
      setAmountMsg(r.message);
      setResult({ ...result!, amountToken: undefined });
    } catch (err) { setAmountMsg((err as Error).message); }
  }

  return (
    <Page narrow>
      {error ? (
        <>
          <Alert tone="error">{error}</Alert>
          <Link className="btn btn-primary mt-4" to="/applications">Open my applications</Link>
        </>
      ) : !result ? <Loading label="Updating your application" /> : (
        <>
          <Alert tone="success">{result.message}</Alert>
          {result.amountToken && (
            <form onSubmit={saveAmount} className="mt-6 flex flex-col gap-2">
              <label htmlFor="amount" className="field-label">How much did you win? <span className="font-normal text-muted">(optional)</span></label>
              <div className="flex gap-2">
                <input id="amount" className="input w-48" inputMode="numeric" placeholder="Whole dollars" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <button className="btn btn-primary">Save amount</button>
              </div>
              <span className="field-hint">Only ever shown to others as part of totals.</span>
            </form>
          )}
          {amountMsg && <p className="mt-2" role="status">{amountMsg}</p>}
          <Link className="btn btn-secondary mt-6" to="/applications">Open my applications</Link>
        </>
      )}
    </Page>
  );
}
