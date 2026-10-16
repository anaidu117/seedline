import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { fitAnswer, wordCount, type Fitted } from '../../shared/drafts/fitAnswer.ts';
import { valueLabel } from '../../shared/vocab.ts';
import { supabase } from '../lib/supabase.ts';
import { useAuth } from '../lib/auth.tsx';
import { fetchOpportunity, type OpportunityRow } from '../lib/opportunities.ts';
import { Alert, Loading, Page, PageTitle } from '../components/ui.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';
import { loadAnswers } from './Answers.tsx';
import NotFound from './NotFound.tsx';

export default function DraftPage() {
  return <RequireAuth><DraftInner /></RequireAuth>;
}

function DraftInner() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [o, setO] = useState<OpportunityRow | null | undefined>(undefined);
  const [fits, setFits] = useState<Fitted[]>([]);
  const [texts, setTexts] = useState<string[]>([]);
  const [savedTexts, setSavedTexts] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const opp = await fetchOpportunity(slug!);
        setO(opp);
        if (!opp) return;
        const [answers, drafts] = await Promise.all([
          loadAnswers(user!.id),
          supabase.from('drafts').select('question_index, body').eq('user_id', user!.id).eq('opportunity_id', opp.id),
        ]);
        const fitted = opp.application_questions.map((q) => fitAnswer(q, answers));
        const stored = new Map((drafts.data ?? []).map((d) => [d.question_index as number, d.body as string]));
        // A saved edit wins over the template fill.
        const initial = fitted.map((f, i) => stored.get(i) ?? f.text);
        setFits(fitted); setTexts(initial); setSavedTexts(initial);
      } catch (e) { setError((e as Error).message); }
    })();
  }, [slug, user?.id]);

  if (error) return <Page><Alert tone="error">{error}</Alert></Page>;
  if (o === undefined) return <Page><Loading /></Page>;
  if (o === null) return <NotFound />;

  async function save() {
    setStatus('');
    const rows = texts.map((body, i) => ({ user_id: user!.id, opportunity_id: o!.id, question_index: i, body, updated_at: new Date().toISOString() }));
    const { error: err } = await supabase.from('drafts').upsert(rows);
    if (err) { setStatus(`Couldn't save: ${err.message}`); return; }
    setSavedTexts([...texts]);
    setStatus('Draft saved.');
  }

  async function copy(i: number) {
    try { await navigator.clipboard.writeText(texts[i]); setStatus(`Copied answer ${i + 1}.`); } catch { setStatus('Copy failed. Select the text and copy it yourself.'); }
  }

  const dirty = JSON.stringify(texts) !== JSON.stringify(savedTexts);
  const flagged = fits.filter((f) => f.status === 'flagged').length;

  return (
    <Page narrow>
      <p className="mb-2"><Link to={`/opportunity/${o.slug}`}>Back to {o.name}</Link></p>
      <PageTitle lead="Filled from your answer bank, using the longest version that fits each limit. Edit freely, then copy each answer into the organizer's form. Templates only, nothing is generated.">
        Draft for {o.name}
      </PageTitle>
      {o.application_questions.length === 0 ? (
        <Alert>This listing has no application questions yet. Check the organizer's application page.</Alert>
      ) : (
        <>
          {flagged > 0 && <Alert>{flagged} of {fits.length} question{fits.length === 1 ? ' needs' : 's need'} your attention. They're marked below.</Alert>}
          <ol className="mt-6 flex flex-col gap-8">
            {o.application_questions.map((q, i) => {
              const f = fits[i];
              const words = wordCount(texts[i] ?? '');
              const over = q.word_limit !== null && words > q.word_limit;
              return (
                <li key={i} className="flex flex-col gap-2">
                  <label htmlFor={`q-${i}`} className="font-display text-[length:var(--text-card)] font-bold">{i + 1}. {q.text}</label>
                  <p className="text-[length:var(--text-meta)] text-muted">
                    {q.word_limit ? `Limit: ${q.word_limit} words` : 'No word limit'}
                    {q.maps_to ? ` · From your ${valueLabel(q.maps_to).toLowerCase()} answer` : ''}
                    {f?.status === 'filled' ? ` (${f.length} version)` : ''}
                  </p>
                  {f?.status === 'flagged' && <p className="rounded-lg border border-amber bg-amber-tint px-3 py-2 text-amber-ink">{f.reason}</p>}
                  <textarea id={`q-${i}`} className="input" rows={Math.min(14, Math.max(4, Math.ceil(words / 12)))} value={texts[i] ?? ''}
                    onChange={(e) => setTexts(texts.map((t, j) => (j === i ? e.target.value : t)))} />
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`tabular ${over ? 'font-semibold text-error' : 'text-muted'}`} aria-live="polite">
                      {words}{q.word_limit ? ` of ${q.word_limit}` : ''} words{over ? `, ${words - q.word_limit!} over the limit` : ''}
                    </span>
                    <button type="button" className="btn btn-quiet" onClick={() => copy(i)} disabled={!texts[i]}>Copy answer</button>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="sticky bottom-0 mt-8 flex flex-wrap items-center gap-3 border-t border-line bg-bg py-3">
            <button className="btn btn-primary" onClick={save} disabled={!dirty}>Save draft</button>
            <Link className="btn btn-quiet" to="/answers">Edit my answer bank</Link>
            {status && <span role="status">{status}</span>}
          </div>
        </>
      )}
    </Page>
  );
}
