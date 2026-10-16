import { Link } from 'react-router';
import { BrandBlock } from '../components/brand.tsx';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
      <BrandBlock as="header" shapes="small" className="px-5 py-7 md:px-8 md:py-9">
        <h1 className="pr-12 text-[length:var(--text-page)] md:text-[length:var(--text-hero-sm)]">We couldn't find that page</h1>
        <p className="mt-3 pr-10">The link may be old or mistyped. You can start from your plan or the funding map.</p>
      </BrandBlock>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/" className="btn btn-primary">Go to the home page</Link>
        <Link to="/map" className="btn btn-secondary">Open the funding map</Link>
      </div>
    </div>
  );
}
