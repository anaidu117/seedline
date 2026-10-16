import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '../lib/auth.tsx';
import { Loading, Page, PageTitle } from './ui.tsx';
import { MagicLinkForm } from '../pages/SignIn.tsx';

/** Shows a sign-in form in place of the page when nobody is signed in. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <Page><Loading /></Page>;
  if (!user) {
    return (
      <Page narrow>
        <PageTitle lead="This page is part of your saved plan. Enter your email and we'll send you a sign-in link.">Sign in to continue</PageTitle>
        <MagicLinkForm next={location.pathname + location.hash} />
      </Page>
    );
  }
  return <>{children}</>;
}
