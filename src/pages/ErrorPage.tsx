import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import NotFound from './NotFound.tsx';
import { BrandBlock } from '../components/brand.tsx';

/** Shown when a page fails unexpectedly, instead of a developer error screen. */
export default function ErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
      <BrandBlock as="header" shapes="small" className="px-5 py-7 md:px-8 md:py-9">
        <h1 className="pr-12 text-[length:var(--text-page)] md:text-[length:var(--text-hero-sm)]">Something went wrong on this page</h1>
      </BrandBlock>
      <p className="mt-4 text-muted">Reload to try again. If it keeps happening, your saved plan is safe and you can start from the home page.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload the page</button>
        <Link to="/" className="btn btn-secondary">Go to the home page</Link>
      </div>
    </div>
  );
}
