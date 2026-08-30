import AppHeader from "../components/AppHeader";

export default function BuyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader title="Buy Number" />
      {children}
    </>
  );
}
