import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
      <h1 className="text-[length:var(--text-page)]">We couldn't find that page</h1>
      <p className="mt-3 text-muted">The link may be old or mistyped. You can start from your plan or the funding map.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/" className="btn btn-primary">Go to the home page</Link>
        <Link to="/map" className="btn btn-secondary">Open the funding map</Link>
      </div>
    </div>
  );
}
