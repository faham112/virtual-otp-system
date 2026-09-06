export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <p className="text-xs text-muted uppercase tracking-wide">Legal</p>
        <h1 className="text-3xl font-bold text-fg mt-1">Privacy Policy</h1>
        <p className="text-sm text-muted mt-2">Last updated: 6 September 2026</p>
      </div>
      <div className="card p-5 sm:p-7 space-y-5 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="text-fg font-semibold text-base mb-2">What we collect</h2>
          <p>We store the username, email, hashed password, wallet balance, deposit receipts, and OTP order history needed to run the service.</p>
        </section>
        <section>
          <h2 className="text-fg font-semibold text-base mb-2">How we use it</h2>
          <p>Data is used to log you in, buy numbers, credit deposits, send reset emails, and review receipts. We do not sell your account list.</p>
        </section>
        <section>
          <h2 className="text-fg font-semibold text-base mb-2">Providers</h2>
          <p>Phone numbers come from third-party SMS APIs. Those providers see the service and country you request, not your password.</p>
        </section>
        <section>
          <h2 className="text-fg font-semibold text-base mb-2">Receipts</h2>
          <p>Deposit slips are stored so admin can verify payment. Do not upload documents that are not the payment proof.</p>
        </section>
        <section>
          <h2 className="text-fg font-semibold text-base mb-2">Cookies</h2>
          <p>A login cookie keeps you signed in until you log out or the session expires.</p>
        </section>
        <section>
          <h2 className="text-fg font-semibold text-base mb-2">Contact</h2>
          <p>Questions about this policy can be sent from the Contact page.</p>
        </section>
      </div>
    </main>
  );
}
