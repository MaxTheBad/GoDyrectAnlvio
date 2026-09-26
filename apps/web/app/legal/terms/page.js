export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for GoDyrect.',
};

const updated = 'September 26, 2026';

export default function TermsPage() {
  return <main className='legal-shell'>
    <header className='legal-hero'>
      <p className='account-kicker'>Terms of Service</p>
      <h1>Move directly.<br />Deal responsibly.</h1>
      <p>Effective {updated}. These Terms govern use of GoDyrect.</p>
      <div className='legal-hero__actions'><a href='/explore' className='account-primary'>Explore opportunities</a><a href='/legal/privacy' className='legal-secondary'>Read privacy</a></div>
    </header>
    <div className='legal-grid'>
      <nav className='legal-toc' aria-label='Terms sections'><a href='#acceptance'>Acceptance</a><a href='#marketplace'>Marketplace role</a><a href='#accounts'>Accounts & content</a><a href='#conduct'>Acceptable use</a><a href='#disputes'>Transactions & disputes</a><a href='#changes'>Changes & contact</a></nav>
      <article className='legal-copy'>
        <section id='acceptance'><p className='account-kicker'>01 — Agreement</p><h2>Acceptance of these Terms</h2><p>By creating an account, posting content, or using GoDyrect, you agree to these Terms and our <a href='/legal/privacy'>Privacy Policy</a>. If you use GoDyrect for an organization, you confirm that you have authority to accept these Terms for it.</p><p>You must be at least 18 years old and able to form a binding agreement to use the service.</p></section>
        <section id='marketplace'><p className='account-kicker'>02 — Our role</p><h2>A marketplace, not a transaction party</h2><p>GoDyrect provides tools to discover opportunities, publish listings, save opportunities, and communicate directly. We are not a broker, business intermediary, lender, investment adviser, escrow agent, fiduciary, or party to a sale, lease, financing, or other transaction.</p><p>We do not verify every listing, member, financial statement, valuation, license, or claim. You are responsible for your diligence, professional advice, legal compliance, and transaction decisions.</p></section>
        <section id='accounts'><p className='account-kicker'>03 — Your account & content</p><h2>Keep it accurate and yours</h2><p>Provide accurate account information and protect your login credentials. You are responsible for activity under your account. Tell us promptly at <a href='mailto:support@godyrect.com'>support@godyrect.com</a> if you believe your account has been used without permission.</p><p>You retain ownership of content you submit. You give GoDyrect a non-exclusive, worldwide, royalty-free license to host, display, reproduce, adapt for technical delivery, and distribute that content as needed to operate and promote the service. You confirm that you have the rights and permissions needed to post it.</p></section>
        <section id='conduct'><p className='account-kicker'>04 — Community standards</p><h2>What is not allowed</h2><p>Do not post unlawful, false, misleading, discriminatory, infringing, confidential, or harmful material. Do not impersonate others, scrape the service, bypass security, send spam, manipulate engagement, or use GoDyrect to facilitate fraud or unlawful activity.</p><p>We may remove content, limit visibility, suspend accounts, or cooperate with lawful requests when needed to protect members, the marketplace, or the public.</p></section>
        <section id='disputes'><p className='account-kicker'>05 — Transactions & disputes</p><h2>Members handle their own deals</h2><p>Any negotiation, inspection, disclosure, diligence, contract, payment, closing, or dispute is solely between the relevant members and their advisers. GoDyrect is not responsible for losses arising from listings, communications, or transactions between members.</p><p>To the maximum extent permitted by law, GoDyrect is provided on an “as is” and “as available” basis. We do not guarantee that listings are accurate, complete, available, or suitable for any purpose.</p></section>
        <section id='changes'><p className='account-kicker'>06 — Changes & contact</p><h2>Updates to these Terms</h2><p>We may update these Terms as GoDyrect evolves. Material changes will be posted here with a revised effective date. Continuing to use GoDyrect after an update means you accept the updated Terms.</p><p>Questions about these Terms can be sent to <a href='mailto:support@godyrect.com'>support@godyrect.com</a>. You may stop using GoDyrect at any time and can request account deletion in <a href='/settings#delete-account'>Settings</a>.</p></section>
      </article>
    </div>
  </main>;
}
