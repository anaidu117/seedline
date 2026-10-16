import { useEffect, useState } from 'react';
import { ANSWER_KEYS, ANSWER_LENGTHS, valueLabel, type AnswerKey, type AnswerLength } from '../../shared/vocab.ts';
import { wordCount, type SavedAnswers } from '../../shared/drafts/fitAnswer.ts';
import { supabase } from '../lib/supabase.ts';
import { useAuth } from '../lib/auth.tsx';
import { Alert, Loading, Page, PageTitle } from '../components/ui.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';

const LENGTH_HINTS: Record<AnswerLength, string> = {
  short: 'About 50 words',
  medium: 'About 150 words',
  long: 'About 300 words',
};

export async function loadAnswers(userId: string): Promise<SavedAnswers> {
  const { data, error } = await supabase.from('answers').select('answer_key, length, body').eq('user_id', userId);
  if (error) throw error;
  const out: SavedAnswers = {};
  for (const r of data ?? []) {
    const k = r.answer_key as AnswerKey;
    out[k] = { ...(out[k] ?? {}), [r.length as AnswerLength]: r.body as string };
  }
  return out;
}

export default function AnswersPage() {
  return <RequireAuth><AnswersInner /></RequireAuth>;
}

function AnswersInner() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedAnswers | null>(null);
  const [draft, setDraft] = useState<SavedAnswers>({});
  const [msg, setMsg] = useState<{ key: string; tone: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    loadAnswers(user!.id).then((a) => { setSaved(a); setDraft(structuredClone(a)); }).catch((e) => setMsg({ key: 'all', tone: 'error', text: e.message }));
  }, [user?.id]);

  async function save(key: AnswerKey) {
    setMsg(null);
    const versions = draft[key] ?? {};
    const upserts = ANSWER_LENGTHS.filter((l) => (versions[l] ?? '').trim()).map((l) => ({ user_id: user!.id, answer_key: key, length: l, body: versions[l]!.trim(), updated_at: new Date().toISOString() }));
    const empties = ANSWER_LENGTHS.filter((l) => !(versions[l] ?? '').trim());
    if (upserts.length) {
      const { error } = await supabase.from('answers').upsert(upserts);
      if (error) { setMsg({ key, tone: 'error', text: `Couldn't save: ${error.message}` }); return; }
    }
    if (empties.length) await supabase.from('answers').delete().eq('user_id', user!.id).eq('answer_key', key).in('length', empties);
    setSaved((cur) => ({ ...cur, [key]: structuredClone(versions) }));
    setMsg({ key, tone: 'success', text: 'Saved.' });
  }

  if (!saved) return <Page>{msg ? <Alert tone="error">{msg.text}</Alert> : <Loading />}</Page>;

  return (
    <Page narrow>
      <PageTitle lead="Write each answer once in up to three lengths. Drafts pick the longest version that fits each question's word limit.">Answer bank</PageTitle>
      <div className="flex flex-col gap-10">
        {ANSWER_KEYS.map((key) => {
          const changed = JSON.stringify(draft[key] ?? {}) !== JSON.stringify(saved[key] ?? {});
          return (
            <section key={key} aria-labelledby={`h-${key}`} className="flex flex-col gap-4">
              <h2 id={`h-${key}`} className="text-[length:var(--text-section)]">{valueLabel(key)}</h2>
              {ANSWER_LENGTHS.map((l) => {
                const v = draft[key]?.[l] ?? '';
                return (
                  <div key={l}>
                    <label className="field-label" htmlFor={`${key}-${l}`}><span className="sr-only">{valueLabel(key)}, </span>{valueLabel(l)} version <span className="font-normal text-muted">({LENGTH_HINTS[l]})</span></label>
                    <textarea id={`${key}-${l}`} className="input" rows={l === 'short' ? 3 : l === 'medium' ? 5 : 8} value={v}
                      onChange={(e) => { const value = e.target.value; setDraft((d) => ({ ...d, [key]: { ...(d[key] ?? {}), [l]: value } })); }} />
                    <span className="field-hint tabular" aria-live="polite">{wordCount(v)} words</span>
                  </div>
                );
              })}
              {msg?.key === key && <Alert tone={msg.tone}>{msg.text}</Alert>}
              <div><button className="btn btn-primary" disabled={!changed} onClick={() => save(key)}>Save {valueLabel(key).toLowerCase()} answer</button></div>
            </section>
          );
        })}
      </div>
    </Page>
  );
}
