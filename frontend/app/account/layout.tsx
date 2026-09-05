import AppHeader from "../components/AppHeader";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader title="Account" />
      {children}
    </>
  );
}
