import AppHeader from "../components/AppHeader";

export default function TransactionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader title="Transactions" />
      {children}
    </>
  );
}
