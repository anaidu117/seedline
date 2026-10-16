import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { LAYER0_FIELD_KEYS } from '../../shared/vocab.ts';
import { ProfileField } from '../components/ProfileField.tsx';
import { Page, PageTitle } from '../components/ui.tsx';
import { readLayer0, writeLayer0, type Layer0 } from '../lib/layer0.ts';
import { track } from '../lib/events.ts';

const OPTIONAL = new Set(['city']);

export default function Start() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Layer0>(() => readLayer0() ?? {});
  const started = () => void track('intake_started', {}, { once: 'intake_started' });

  function submit(e: FormEvent) {
    e.preventDefault();
    writeLayer0(answers);
    void track('layer0_finished', { school: answers.school, sector: answers.sector }, { once: 'layer0_finished' });
    navigate('/preview');
  }

  return (
    <Page narrow>
      <PageTitle lead="Seven quick questions, about two minutes. No account needed. Your answers stay in this browser until you choose to save them.">
        Tell us about your startup
      </PageTitle>
      <form onSubmit={submit} onFocusCapture={started} className="flex flex-col gap-7">
        {LAYER0_FIELD_KEYS.map((k) => (
          <ProfileField key={k} k={k as Exclude<typeof k, 'founder_groups'>} value={answers[k as keyof Layer0] as string | boolean | null | undefined}
            required={!OPTIONAL.has(k)} onChange={(v) => setAnswers({ ...answers, [k]: v })} />
        ))}
        <div><button className="btn btn-primary">See my matches</button></div>
      </form>
    </Page>
  );
}
