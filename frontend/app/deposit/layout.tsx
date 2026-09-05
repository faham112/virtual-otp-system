import AppHeader from "../components/AppHeader";

export default function DepositLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader title="Deposit" />
      {children}
    </>
  );
}
