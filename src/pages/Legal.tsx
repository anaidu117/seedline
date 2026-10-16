import type { ReactNode } from 'react';
import { Page } from '../components/ui.tsx';

// The contact address is a placeholder until the domain is set up (listed in PROGRESS.md under Needs your decision).
const CONTACT = 'the contact email listed on this page once Seedline launches';

function DraftBanner() {
  return <p className="mb-6 rounded-lg border border-amber bg-amber-tint px-4 py-3 font-semibold text-amber-ink">Draft, not binding. This page is being reviewed and may change.</p>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mt-8"><h2 className="text-[length:var(--text-section)]">{title}</h2><div className="mt-2 flex flex-col gap-3">{children}</div></section>;
}

export function Privacy() {
  return (
    <Page narrow>
      <DraftBanner />
      <h1 className="text-[length:var(--text-page)]">Privacy</h1>
      <p className="mt-3">This describes what Seedline actually collects and who receives it. Seedline does not sell data, show ads, or use third-party analytics.</p>
      <Section title="What we collect">
        <p><span className="font-semibold">Before you sign up.</span> Your answers to the first questions (school, student status, state, city, stage, sector, whether you're incorporated) are kept in your browser's local storage, not on our servers, until you create an account. We also store a random ID in your browser to count how many visitors start and finish those questions. It is not linked to your name or email.</p>
        <p><span className="font-semibold">Your account.</span> Your email address, used to send sign-in links and the emails you choose to receive.</p>
        <p><span className="font-semibold">Your profile.</span> The answers you give about your company, the milestones you mark, and your email settings. Every answer is optional except where a form says otherwise.</p>
        <p><span className="font-semibold">Founder groups (optional).</span> If you choose to answer, we use it only to match you to programs for specific groups. It is stored separately, is never shown publicly, is never included in shared plans, and is not visible to Seedline admins.</p>
        <p><span className="font-semibold">Materials, answers and drafts.</span> Files and links you add, your answer bank, and your application drafts. Files are stored privately and opened only through links that expire after 60 seconds.</p>
        <p><span className="font-semibold">Applications and outcomes.</span> The programs you save and the results you report. Other founders only ever see outcomes as totals, and only once at least 10 founders at the same stage and sector have reported for a program.</p>
        <p><span className="font-semibold">Usage events.</span> We record a small set of steps (started the questions, created an account, generated a plan, changed an application status, created or opened a share link) with the school and sector where relevant, to measure whether Seedline is useful. These are only shown to admins as totals.</p>
        <p><span className="font-semibold">Submissions and claims.</span> If you submit a program or claim a listing, we keep what you sent and your email.</p>
      </Section>
      <Section title="Sharing and links you create">
        <p>If you create a share link, anyone with the password, or the people you invite, can see a read-only copy of your plan until you turn the link off or it expires. If you create a calendar feed link, anyone with that link can see your deadlines. Making a new feed link turns off the old one.</p>
      </Section>
      <Section title="Who receives data">
        <p><span className="font-semibold">Supabase</span> hosts our database, sign-in, file storage and server functions. All data above is stored there.</p>
        <p><span className="font-semibold">Resend</span> delivers our emails. It receives your email address and the content of each email.</p>
        <p><span className="font-semibold">Cloudflare</span> hosts the website and runs the bot check on the submission form (Turnstile). It receives standard request data such as your IP address.</p>
        <p><span className="font-semibold">Google Fonts</span> serves the fonts this site uses. Your browser requests them from Google, which receives your IP address.</p>
      </Section>
      <Section title="Emails">
        <p>We send sign-in links, a weekly digest only when something changed, deadline reminders, and short check-ins after deadlines. Each email has a one-click unsubscribe link, and you can change these in your profile.</p>
      </Section>
      <Section title="Your choices">
        <p>You can change or clear your answers, remove founder groups, delete materials, answers and applications, and turn off share links and emails at any time. To delete your account and all of its data, email {CONTACT}.</p>
      </Section>
    </Page>
  );
}

export function Terms() {
  return (
    <Page narrow>
      <DraftBanner />
      <h1 className="text-[length:var(--text-page)]">Terms</h1>
      <Section title="What Seedline is">
        <p>Seedline is an information tool. It lists grants, competitions, fellowships, accelerators and other programs, and suggests which ones may fit your startup and in what order. It is free to use.</p>
        <p>Seedline does not arrange investments, does not take any share of funding you receive, and is not affiliated with the programs it lists unless a listing says it is verified by its organizer.</p>
      </Section>
      <Section title="Information only">
        <p>Information only, not legal or investment advice. Always confirm details with the organizer. Program details change, and our listings can be out of date or wrong. Eligibility shown here is our best reading of public information, not a decision by the organizer.</p>
        <p>Amounts are shown as "up to" because founders rarely win everything they apply for.</p>
      </Section>
      <Section title="Your responsibilities">
        <p>Give accurate answers, keep your sign-in email secure, and only upload materials you have the right to use. Don't use Seedline to submit false listings or to claim programs you don't run.</p>
      </Section>
      <Section title="Listings and claims">
        <p>Anyone can submit a program; we review each one before it appears. Organizers can claim their listing. Once we approve a claim, the organizer can edit that listing, and we review the changes.</p>
      </Section>
      <Section title="Changes and contact">
        <p>We may update these terms. Questions: {CONTACT}.</p>
      </Section>
    </Page>
  );
}
