import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function Page({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return <div className={`mx-auto ${narrow ? 'max-w-3xl' : 'max-w-6xl'} px-4 py-8 md:px-6 md:py-12`}>{children}</div>;
}

export function PageTitle({ children, lead }: { children: ReactNode; lead?: ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="text-[length:var(--text-page)]">{children}</h1>
      {lead && <p className="mt-2 max-w-2xl text-muted">{lead}</p>}
    </header>
  );
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: ReactNode }) {
  const cls = tone === 'error'
    ? 'border-error bg-error-tint text-error'
    : tone === 'success' ? 'border-carolina bg-blue-tint text-navy' : 'border-line bg-surface text-navy';
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 ${cls}`}>{children}</div>;
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return <p className="py-8 text-muted" role="status">{label}...</p>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: { to: string; label: string } }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-8">
      <h2 className="text-[length:var(--text-card)]">{title}</h2>
      {children && <div className="mt-2 max-w-xl text-muted">{children}</div>}
      {action && <Link className="btn btn-primary mt-4" to={action.to}>{action.label}</Link>}
    </div>
  );
}

export function SectionTitle({ children, count, id }: { children: ReactNode; count?: number; id?: string }) {
  return (
    <h2 id={id} className="flex items-baseline gap-2 text-[length:var(--text-section)]">
      {children}
      {count !== undefined && <span className="tabular font-sans text-[length:var(--text-body)] font-semibold text-muted">({count})</span>}
    </h2>
  );
}
