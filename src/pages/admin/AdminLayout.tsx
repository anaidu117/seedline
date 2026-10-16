import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../lib/auth.tsx';
import { Alert, Loading, Page } from '../../components/ui.tsx';

const TABS = [
  { to: '/admin', label: 'Opportunities', end: true },
  { to: '/admin/import', label: 'Import CSV' },
  { to: '/admin/verification', label: 'Verification queue' },
  { to: '/admin/staleness', label: 'Staleness queue' },
  { to: '/admin/submissions', label: 'Submissions' },
  { to: '/admin/claims', label: 'Claims' },
  { to: '/admin/metrics', label: 'Metrics' },
];

/** The UI gate for admin pages. The real protection is RLS and the Edge Function checks. */
export function AdminLayout() {
  const { loading, user, isAdmin, adminChecked } = useAuth();
  const location = useLocation();
  if (loading || !adminChecked) return <Page><Loading /></Page>;
  if (!user) {
    return (
      <Page narrow>
        <Alert>Sign in with an admin email to use this page.</Alert>
        <Link className="btn btn-primary mt-4" to={`/signin?next=${encodeURIComponent(location.pathname)}`}>Sign in</Link>
      </Page>
    );
  }
  if (!isAdmin) {
    return (
      <Page narrow>
        <Alert tone="error">This page is only for Seedline admins. You're signed in as {user.email}.</Alert>
      </Page>
    );
  }
  return (
    <Page>
      <h1 className="text-[length:var(--text-page)]">Admin</h1>
      <nav aria-label="Admin" className="mt-4 mb-8 overflow-x-auto border-b border-line">
        <ul className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <li key={t.to}>
              <NavLink end={t.end} to={t.to} className={({ isActive }) => `flex min-h-11 items-center border-b-2 px-3 font-semibold no-underline ${isActive ? 'border-carolina text-navy' : 'border-transparent text-muted hover:text-navy'}`}>
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </Page>
  );
}

