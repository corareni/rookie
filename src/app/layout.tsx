import type { Metadata, Viewport } from "next";
import { Archivo_Black, Plus_Jakarta_Sans } from "next/font/google";
import Header from "@/components/Header";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const mega = Archivo_Black({ variable: "--font-mega", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: `${site.name}: your internship applications on one board`,
  description: site.oneLiner,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${jakarta.variable} ${mega.variable} antialiased`}>
      <body>
        <Header email={user?.email ?? null} />
        <div className="wrap pb-20">{children}</div>
      </body>
    </html>
  );
}
