import Link from "next/link";
import LegalFrame from "../components/LegalFrame";

export default function TermsPage() {
  return (
    <LegalFrame current="/terms" title="Terms and Conditions" updated="6 September 2026">
      <div className="card p-5 sm:p-7 space-y-6 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="text-fg font-semibold text-base mb-2">1. No refund policy</h2>
          <p>
            All purchases, deposits, and OTP number orders are final. Virtual OTP does not offer refunds, chargebacks,
            or unused-balance cash-outs once a payment is approved or a number is bought. Wallet credit is only for use
            inside this website. If an order is cancelled by the system before a number is issued, the same wallet amount
            may be returned as site credit — not as a bank or USDT refund.
          </p>
        </section>
        <section>
          <h2 className="text-fg font-semibold text-base mb-2">2. Better quality OTPs work more reliably</h2>
          <p>
            Cheap numbers are more likely to fail, stay pending, or be blocked by Facebook and other apps. The Better Quality
            filter uses higher-priced stock that usually delivers a working code. Choosing Cheaper means you accept a higher
            chance of delay or failure. Price does not guarantee a code, but quality stock is the recommended option.
          </p>
        </section>
        <section>
          <h2 className="text-fg font-semibold text-base mb-2">3. Fair use of the website</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the service only for accounts you are allowed to create or recover.</li>
            <li>Do not abuse stock, resell numbers without permission, or attack the site.</li>
            <li>One person should keep one account. Shared or fake accounts can be closed.</li>
            <li>We may pause buying, change prices, or limit countries when providers change stock.</li>
            <li>Deposits must match the amount and receipt you submit. Fake slips can ban the account.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-fg font-semibold text-base mb-2">4. Website errors and our responsibility</h2>
          <p>
            If the website itself breaks — for example a paid order never starts, wallet credit is removed by a clear system
            bug, or a receipt we approved is not applied — we will fix the account or restore the same wallet credit.
            That is the limit of our responsibility. We are not liable for lost app accounts, lost time, extra fees, or any
            damage outside this website.
          </p>
        </section>
        <section>
          <h2 className="text-fg font-semibold text-base mb-2">5. If an OTP does not work, that is usually not our fault</h2>
          <p>
            Numbers come from third-party SMS providers. Facebook, WhatsApp, Google, and similar apps decide whether they
            accept a number. If a code never arrives, arrives late, or the app says the number is invalid, that is typically
            a block or filter on Facebook's side (or the other app), not a billing error on Virtual OTP. Try Better Quality
            or another country. We do not refund because Facebook rejected the number.
          </p>
        </section>
        <section>
          <h2 className="text-fg font-semibold text-base mb-2">Acceptance</h2>
          <p>
            Creating an account, depositing funds, or buying a number means you have read and accepted these terms.
            If you do not agree, do not register or use the service.
          </p>
        </section>
      </div>
      <div className="flex gap-3 mt-5">
        <Link href="/register" className="btn-primary text-sm">I understand — create account</Link>
        <Link href="/legal" className="btn-ghost text-sm">All pages</Link>
      </div>
    </LegalFrame>
  );
}
