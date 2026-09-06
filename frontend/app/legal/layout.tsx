import AppHeader from "../components/AppHeader";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader title="Pages" />
      {children}
    </>
  );
}
