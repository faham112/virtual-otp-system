import AppHeader from "../components/AppHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader title="Admin" />
      {children}
    </>
  );
}
