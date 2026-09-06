import LegalFrame from "../components/LegalFrame";

export default function FaqPage() {
  const rows = [
    ["How do I buy a number?", "Deposit PKR, wait for admin approval, then open Buy. Keep Better quality selected for a higher chance the OTP arrives."],
    ["Why is there no refund?", "Numbers are rented from a provider the moment you click Buy. Read Terms. Wallet credit is only returned if the system cancels before a number is issued."],
    ["OTP is pending or Facebook rejects it.", "That is usually the app blocking virtual numbers, not a site billing error. Try Better quality or another country."],
    ["How long does a deposit take?", "As soon as admin checks the receipt card on WhatsApp. Keep the slip clear."],
    ["I forgot my password.", "Use Forgot password and the code sent to your registered email."],
  ];
  return (
    <LegalFrame current="/faq" title="FAQ">
      <div className="space-y-3">
        {rows.map(([q, a]) => (
          <div key={q} className="card p-5">
            <p className="text-fg font-medium">{q}</p>
            <p className="text-sm text-muted mt-2">{a}</p>
          </div>
        ))}
      </div>
    </LegalFrame>
  );
}
