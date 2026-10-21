import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import ChatBubble from "@/components/ChatBubble";
import Header from "@/components/Header";
import { TasksProvider } from "@/components/Tasks";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "700"],
});

export const metadata: Metadata = {
  // Lowercase "rookie", like the logo.
  title: `${site.name.toLowerCase()} - ${site.tagline}`,
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
  // The name from the user's profile (CV header), else from their Google account. No name yet: show none,
  // it appears once they add their CV.
  const { data: profile } = user ? await supabase.from("profiles").select("contact").maybeSingle() : { data: null };
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  const name = ((profile?.contact as { name?: string } | null)?.name || meta.full_name || meta.name || "").trim();

  return (
    <html lang="en" className={`${jakarta.variable} antialiased`}>
      <body>
        <div className="frame print:m-0 print:rounded-none print:p-0">
          <TasksProvider>
            <Header email={user?.email ?? null} name={name || null} />
            <div className="wrap pt-4 pb-6">{children}</div>
            {user && <ChatBubble />}
          </TasksProvider>
        </div>
      </body>
    </html>
  );
}
