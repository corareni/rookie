import AppTabs from "@/components/AppTabs";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <>
      <AppTabs />
      {children}
    </>
  );
}
