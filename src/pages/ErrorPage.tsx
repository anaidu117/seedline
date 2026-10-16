import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import NotFound from './NotFound.tsx';

/** Shown when a page fails unexpectedly, instead of a developer error screen. */
export default function ErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
      <h1 className="text-[length:var(--text-page)]">Something went wrong on this page</h1>
      <p className="mt-3 text-muted">Reload to try again. If it keeps happening, your saved plan is safe and you can start from the home page.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload the page</button>
        <Link to="/" className="btn btn-secondary">Go to the home page</Link>
      </div>
    </div>
  );
}
