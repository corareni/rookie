import { CompareProvider } from "@/components/CompareToast";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <CompareProvider>{children}</CompareProvider>;
}
