import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Header from "@/components/Header";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "700"],
});

export const metadata: Metadata = {
  title: `${site.name}: ${site.tagline}`,
  description: site.oneLiner,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e6e6ea",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Show the name from the user's CV and letter header, falling back to their email.
  const { data: profile } = user ? await supabase.from("profiles").select("contact").maybeSingle() : { data: null };
  const name = ((profile?.contact as { name?: string } | null)?.name ?? "").trim();

  return (
    <html lang="en" className={`${jakarta.variable} antialiased`}>
      <body>
        <div className="frame print:m-0 print:rounded-none print:p-0">
          <Header email={user?.email ?? null} name={name || null} />
          <div className="wrap pt-4 pb-6">{children}</div>
        </div>
      </body>
    </html>
  );
}
