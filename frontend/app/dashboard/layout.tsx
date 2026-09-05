import AppHeader from "../components/AppHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader title="Dashboard" />
      {children}
    </>
  );
}
