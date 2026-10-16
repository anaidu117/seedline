import { Link } from 'react-router';

export default function Landing() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6">
      <section className="py-16 md:py-24">
        <h1 className="max-w-3xl text-[length:var(--text-hero-sm)] md:text-[length:var(--text-hero)]">
          Find the grants, competitions and programs you should apply to, and in what order.
        </h1>
        <p className="mt-5 max-w-2xl text-[length:var(--text-card)] text-muted">
          Answer a few questions about your startup. Seedline shows what you qualify for, why, and what to apply to first. Seedline is free and never takes a share of anything you win.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/start" className="btn btn-primary">Find my funding</Link>
          <Link to="/map" className="btn btn-secondary">Browse the funding map</Link>
        </div>
      </section>
    </div>
  );
}
