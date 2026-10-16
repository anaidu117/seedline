import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  FOUNDER_GROUPS, LAYER0_FIELD_KEYS, LAYER2_FIELD_KEYS, LAYER_UNLOCKS, MILESTONES, PROFILE_FIELDS, valueLabel,
  type FounderGroup, type Milestone,
} from '../../shared/vocab.ts';
import { applyMilestone, type Unlocked } from '../../shared/matching/index.ts';
import { supabase } from '../lib/supabase.ts';
import { useAuth } from '../lib/auth.tsx';
import { loadFounder, useFounder, type FounderData } from '../lib/founder.ts';
import { track } from '../lib/events.ts';
import { ProfileField } from '../components/ProfileField.tsx';
import { Alert, Loading, Page, PageTitle } from '../components/ui.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';

export default function ProfilePage() {
  return <RequireAuth><ProfileInner /></RequireAuth>;
}

type Answers = Record<string, string | boolean | null | undefined>;

function isAnswered(v: unknown): boolean {
  return v !== null && v !== undefined && v !== '';
}

function ProfileInner() {
  const { user, signOut } = useAuth();
  const { data, error, setData } = useFounder(user?.id);
  if (error) return <Page><Alert tone="error">We couldn't load your profile: {error}</Alert></Page>;
  if (!data) return <Page><Loading /></Page>;
  return <ProfileView data={data} setData={setData} userId={user!.id} email={user!.email ?? ''} signOut={signOut} />;
}

function ProfileView({ data, setData, userId, email, signOut }: {
  data: FounderData; setData: (d: FounderData) => void; userId: string; email: string; signOut: () => Promise<void>;
}) {
  const row = data.profileRow;
  const [basics, setBasics] = useState<Answers>(() => Object.fromEntries(LAYER0_FIELD_KEYS.map((k) => [k, row[k] as Answers[string]])));
  const [company, setCompany] = useState<Answers>(() => Object.fromEntries(LAYER2_FIELD_KEYS.map((k) => [k, row[k] as Answers[string]])));
  const [groups, setGroups] = useState<FounderGroup[]>(data.groups?.groups ?? []);
  const [preferNot, setPreferNot] = useState<boolean>(data.groups?.prefer_not_to_say ?? false);
  const [msg, setMsg] = useState<{ where: string; tone: 'success' | 'error'; text: string } | null>(null);
  const [unlocked, setUnlocked] = useState<Unlocked[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async (): Promise<FounderData> => {
    const next = await loadFounder(userId);
    setData(next);
    return next;
  };

  async function saveFields(where: string, values: Answers) {
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('profiles').update(values).eq('user_id', userId);
    if (error) { setBusy(false); setMsg({ where, tone: 'error', text: `Couldn't save: ${error.message}` }); return; }
    const before = LAYER2_FIELD_KEYS.filter((k) => !PROFILE_FIELDS[k].optional).every((k) => isAnswered(row[k]));
    const next = await refresh();
    const after = LAYER2_FIELD_KEYS.filter((k) => !PROFILE_FIELDS[k].optional).every((k) => isAnswered(next.profileRow[k]));
    if (!before && after) void track('layer2_finished', { school: next.profile.school, sector: next.profile.sector });
    setUnlocked(next.unlocked);
    setBusy(false);
    setMsg({ where, tone: 'success', text: 'Saved. Your plan is updated.' });
  }

  async function toggleMilestone(m: Milestone) {
    setBusy(true); setMsg(null);
    const has = row.milestones.includes(m) || (m === 'incorporated' && row.incorporated === true);
    let update: Record<string, unknown>;
    if (has) {
      // Unmarking only removes the milestone. Stage is never lowered automatically.
      update = { milestones: row.milestones.filter((x) => x !== m), ...(m === 'incorporated' ? { incorporated: false } : {}) };
    } else {
      const next = applyMilestone(data.profile, m);
      update = { milestones: next.milestones, incorporated: next.incorporated ?? null, stage: next.stage ?? null };
    }
    const { error } = await supabase.from('profiles').update(update).eq('user_id', userId);
    if (error) { setBusy(false); setMsg({ where: 'milestones', tone: 'error', text: `Couldn't save: ${error.message}` }); return; }
    const next = await refresh();
    setBasics((b) => ({ ...b, stage: next.profileRow.stage as string, incorporated: next.profileRow.incorporated as boolean }));
    setUnlocked(next.unlocked);
    setBusy(false);
  }

  async function saveGroups(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('profile_founder_groups').upsert({ user_id: userId, groups: preferNot ? [] : groups, prefer_not_to_say: preferNot, answered_at: new Date().toISOString() });
    if (error) { setBusy(false); setMsg({ where: 'groups', tone: 'error', text: `Couldn't save: ${error.message}` }); return; }
    const next = await refresh();
    setUnlocked(next.unlocked);
    setBusy(false);
    setMsg({ where: 'groups', tone: 'success', text: 'Saved.' });
  }

  async function clearGroups() {
    setBusy(true);
    await supabase.from('profile_founder_groups').delete().eq('user_id', userId);
    setGroups([]); setPreferNot(false);
    await refresh();
    setBusy(false);
    setMsg({ where: 'groups', tone: 'success', text: 'Your answer is removed.' });
  }

  async function saveEmail(k: 'email_digest' | 'email_reminders' | 'email_checkins', v: boolean) {
    const { error } = await supabase.from('profiles').update({ [k]: v }).eq('user_id', userId);
    if (error) { setMsg({ where: 'email', tone: 'error', text: `Couldn't save: ${error.message}` }); return; }
    await refresh();
  }

  // What each unfilled layer would unlock, in plain words. No completion percentage.
  const missing0 = LAYER0_FIELD_KEYS.filter((k) => k !== 'city' && !isAnswered(row[k]));
  const missing2 = LAYER2_FIELD_KEYS.filter((k) => !PROFILE_FIELDS[k].optional && !isAnswered(row[k]));
  const todo: { title: string; unlocks: string; detail: string; href: string }[] = [];
  if (missing0.length) todo.push({ ...LAYER_UNLOCKS[0], detail: `${missing0.length} question${missing0.length === 1 ? '' : 's'} left`, href: '#basics' });
  if (missing2.length) todo.push({ ...LAYER_UNLOCKS[2], detail: `${missing2.length} question${missing2.length === 1 ? '' : 's'} left`, href: '#company' });
  if (data.materials.size === 0) todo.push({ ...LAYER_UNLOCKS[3], detail: 'Add your materials and saved answers', href: '/materials' });
  if (!data.groups) todo.push({ ...LAYER_UNLOCKS.optional, detail: 'Optional', href: '#founder-groups' });

  const note = (where: string) => msg?.where === where ? <Alert tone={msg.tone}>{msg.text}</Alert> : null;
  const bySlug = new Map(data.opportunities.map((o) => [o.slug, o]));

  return (
    <Page narrow>
      <PageTitle lead={`Signed in as ${email}. Each part you fill in unlocks something specific.`}>Your profile</PageTitle>

      {unlocked && unlocked.length > 0 && (
        <section aria-live="polite" className="mb-8 rounded-xl border-2 border-carolina p-4">
          <h2 className="text-[length:var(--text-card)]">Newly unlocked</h2>
          <ul className="mt-2 list-disc pl-5">{unlocked.map((u) => <li key={u.slug}><Link to={`/opportunity/${u.slug}`}>{bySlug.get(u.slug)?.name ?? u.slug}</Link></li>)}</ul>
          <Link to="/plan" className="btn btn-secondary mt-3">See my plan</Link>
        </section>
      )}

      {todo.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[length:var(--text-section)]">What you can unlock</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {todo.map((t) => (
              <li key={t.title} className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:gap-4">
                <div className="flex-1">
                  <p className="font-semibold">{t.title} <span className="font-normal text-muted">({t.detail})</span></p>
                  <p className="text-muted">Unlocks: {t.unlocks}</p>
                </div>
                {t.href.startsWith('#') ? <a className="btn btn-secondary" href={t.href}>Fill this in</a> : <Link className="btn btn-secondary" to={t.href}>Fill this in</Link>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="milestones" className="mb-10 scroll-mt-4">
        <h2 className="text-[length:var(--text-section)]">Milestones</h2>
        <p className="mt-1 text-muted">Mark what you've done. Your plan updates right away.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MILESTONES.map((m) => {
            const on = row.milestones.includes(m) || (m === 'incorporated' && row.incorporated === true);
            return (
              <button key={m} type="button" aria-pressed={on} disabled={busy} onClick={() => toggleMilestone(m)}
                className={`btn ${on ? 'border-carolina bg-blue-tint text-navy' : 'btn-secondary'}`}>
                {on && <span aria-hidden="true">✓</span>}{valueLabel(m)}
              </button>
            );
          })}
        </div>
        <div className="mt-3">{note('milestones')}</div>
      </section>

      <form id="basics" className="mb-10 flex scroll-mt-4 flex-col gap-6" onSubmit={(e) => { e.preventDefault(); void saveFields('basics', basics); }}>
        <h2 className="text-[length:var(--text-section)]">{LAYER_UNLOCKS[0].title}</h2>
        {LAYER0_FIELD_KEYS.map((k) => (
          <ProfileField key={k} k={k as Exclude<typeof k, 'founder_groups'>} value={basics[k]} onChange={(v) => setBasics({ ...basics, [k]: v })} />
        ))}
        {note('basics')}
        <div><button className="btn btn-primary" disabled={busy}>Save the basics</button></div>
      </form>

      <form id="company" className="mb-10 flex scroll-mt-4 flex-col gap-6" onSubmit={(e) => { e.preventDefault(); void saveFields('company', company); }}>
        <div>
          <h2 className="text-[length:var(--text-section)]">{LAYER_UNLOCKS[2].title}</h2>
          <p className="mt-1 text-muted">Unlocks: {LAYER_UNLOCKS[2].unlocks} Skip anything you don't know yet. An unanswered question never counts against you.</p>
        </div>
        {LAYER2_FIELD_KEYS.map((k) => (
          <ProfileField key={k} k={k as Exclude<typeof k, 'founder_groups'>} value={company[k]} onChange={(v) => setCompany({ ...company, [k]: v })} />
        ))}
        {note('company')}
        <div><button className="btn btn-primary" disabled={busy}>Save company details</button></div>
      </form>

      <form id="founder-groups" className="mb-10 scroll-mt-4" onSubmit={saveGroups}>
        <fieldset>
          <legend className="font-display text-[length:var(--text-section)] font-bold">{LAYER_UNLOCKS.optional.title} <span className="font-sans text-[length:var(--text-body)] font-normal text-muted">(optional)</span></legend>
          <p className="mt-1 text-muted">{PROFILE_FIELDS.founder_groups.why}</p>
          <p className="mt-2 font-semibold">{PROFILE_FIELDS.founder_groups.question}</p>
          <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
            {FOUNDER_GROUPS.map((g) => (
              <label key={g} className="flex min-h-11 items-center gap-3">
                <input type="checkbox" className="size-5 accent-[var(--color-link)]" disabled={preferNot} checked={!preferNot && groups.includes(g)}
                  onChange={(e) => setGroups(e.target.checked ? [...groups, g] : groups.filter((x) => x !== g))} />
                {valueLabel(g)}
              </label>
            ))}
          </div>
          <label className="mt-2 flex min-h-11 items-center gap-3 font-semibold">
            <input type="checkbox" className="size-5 accent-[var(--color-link)]" checked={preferNot} onChange={(e) => setPreferNot(e.target.checked)} />
            Prefer not to say
          </label>
          <p className="field-hint">Leaving every box unchecked and saving means none apply. "Prefer not to say" keeps those programs in their own section of your plan.</p>
        </fieldset>
        <div className="mt-3">{note('groups')}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={busy}>Save founder groups</button>
          {data.groups && <button type="button" className="btn btn-quiet" onClick={clearGroups} disabled={busy}>Remove my answer</button>}
        </div>
      </form>

      <section id="email" className="mb-10 scroll-mt-4">
        <h2 className="text-[length:var(--text-section)]">Emails</h2>
        <p className="mt-1 text-muted">Every email also has a one-click unsubscribe link.</p>
        {([
          ['email_digest', 'Weekly digest, only when something changed'],
          ['email_reminders', 'Reminders 14 and 3 days before deadlines you saved'],
          ['email_checkins', 'Quick check-ins after deadlines and decisions'],
        ] as const).map(([k, label]) => (
          <label key={k} className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5 accent-[var(--color-link)]" checked={row[k]} onChange={(e) => saveEmail(k, e.target.checked)} />
            {label}
          </label>
        ))}
        {note('email')}
      </section>

      <button className="btn btn-secondary" onClick={() => void signOut()}>Sign out</button>
    </Page>
  );
}
