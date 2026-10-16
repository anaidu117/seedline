import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../lib/auth.tsx';
import { Alert, Loading, Page } from '../components/ui.tsx';
import { safeNext } from './SignIn.tsx';

export default function AuthCallback() {
  const { session, loading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const errorText = params.get('error_description');

  useEffect(() => {
    if (session) navigate(safeNext(params.get('next')), { replace: true });
  }, [session, navigate, params]);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  if (errorText || (timedOut && !session && !loading)) {
    return (
      <Page narrow>
        <Alert tone="error">
          <p className="font-semibold">That sign-in link didn't work.</p>
          <p className="mt-1">{errorText ?? 'It may have expired or been used already.'} Request a new link and open it on the same device.</p>
        </Alert>
        <Link className="btn btn-primary mt-4" to="/signin">Send a new link</Link>
      </Page>
    );
  }
  return <Page narrow><Loading label="Signing you in" /></Page>;
}
