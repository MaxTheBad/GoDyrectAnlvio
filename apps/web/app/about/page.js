export const metadata = { title: 'How GoDyrect works', description: 'Discover business opportunities, shortlist the right ones, and connect directly on GoDyrect.' };

export default function AboutPage() {
  return <main className="home-shell">
    <section className="home-hero">
      <p className="account-kicker">The business opportunity marketplace</p>
      <h1>Better business deals start <em>direct.</em></h1>
      <p>GoDyrect is a place to discover businesses and opportunities, save the ones worth a second look, and speak directly with the people behind them.</p>
      <div className="home-hero__actions"><a className="account-primary" href="/">Explore opportunities</a></div>
      <div className="home-proof"><span>Browse public listings</span><span>Connect directly</span><span>Built for serious next steps</span></div>
    </section>
    <section className="home-flow" aria-label="How GoDyrect works">
      <article><b>01</b><h2>Discover</h2><p>Search opportunities by industry, location, price, and business stage—without needing an account.</p></article>
      <article><b>02</b><h2>Shortlist</h2><p>Create a free account to save possibilities and build a practical buyer shortlist.</p></article>
      <article><b>03</b><h2>Move direct</h2><p>Message business owners and representatives from a single professional workspace.</p></article>
    </section>
  </main>;
}
