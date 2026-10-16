import { useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router';
import { Disclaimer } from './Disclaimer.tsx';

const NAV = [
  { to: '/plan', label: 'Plan' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/applications', label: 'Applications' },
  { to: '/materials', label: 'Materials' },
  { to: '/answers', label: 'Answers' },
  { to: '/map', label: 'Funding map' },
];

export function Logo() {
  return (
    <Link to="/" className="inline-flex min-h-11 items-center gap-2 font-display text-[1.375rem] font-bold text-navy no-underline">
      <svg aria-hidden="true" width="28" height="28" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#13294B"/><path d="M16 25V14" stroke="#4B9CD3" strokeWidth="3" strokeLinecap="round"/><path d="M16 15c0-4 3-7 8-7 0 4-3 7-8 7zM16 18c0-3-2.5-5.5-6.5-5.5 0 3 2.5 5.5 6.5 5.5z" fill="#4B9CD3"/></svg>
      Seedline
    </Link>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-bg focus:p-3">Skip to content</a>
      <header className="border-b border-line bg-bg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 md:px-6">
          <Logo />
          <button
            type="button"
            className="btn btn-quiet md:hidden"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((o) => !o)}
          >
            Menu
          </button>
          <nav id="main-nav" aria-label="Main" className={`${open ? 'block' : 'hidden'} absolute left-0 right-0 top-[61px] z-40 border-b border-line bg-bg px-4 pb-3 md:static md:block md:border-0 md:p-0`}>
            <ul className="flex flex-col gap-1 md:flex-row md:items-center md:gap-1">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center rounded-lg px-3 font-semibold no-underline ${isActive ? 'bg-blue-tint text-navy' : 'text-navy hover:bg-surface'}`
                    }
                  >
                    {n.label}
                  </NavLink>
                </li>
              ))}
              <li>
                <NavLink to="/profile" onClick={() => setOpen(false)} className={({ isActive }) => `flex min-h-11 items-center rounded-lg px-3 font-semibold no-underline ${isActive ? 'bg-blue-tint text-navy' : 'text-navy hover:bg-surface'}`}>
                  Profile
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 md:px-6">
          <Disclaimer />
          <ul className="flex flex-wrap gap-x-2 gap-y-1 text-[length:var(--text-meta)]">
            <li><Link className="inline-flex min-h-11 items-center px-1" to="/map">Funding map</Link></li>
            <li><Link className="inline-flex min-h-11 items-center px-1" to="/submit">Submit an opportunity</Link></li>
            <li><Link className="inline-flex min-h-11 items-center px-1" to="/privacy">Privacy</Link></li>
            <li><Link className="inline-flex min-h-11 items-center px-1" to="/terms">Terms</Link></li>
          </ul>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  );
}
