import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { NavLinks } from "./components/NavLinks";
import { ThemeToggle } from "./components/ThemeToggle";
import { LogoLockup } from "./components/Logo";
import { getCurrentProfile } from "@/lib/auth";
import { signOut } from "./login/actions";
import "./globals.css";

// Runs before paint to apply the saved theme and avoid a flash of the wrong colors.
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    if (!t) t = 'dark';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Servian Contracting — CRM",
  description: "Client relationship management for Servian Contracting",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Servian CRM",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-(--background) text-(--text-primary) antialiased">
        {profile && (
          <header className="border-b border-(--border) bg-(--surface)">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
              <Link
                href="/home"
                className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
              >
                <LogoLockup compact />
                <span className="text-[10px] font-medium text-(--text-muted) uppercase tracking-widest border-l border-(--border) pl-2">
                  CRM
                </span>
              </Link>
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <NavLinks isManager={profile.isManager} />
                <div className="hidden sm:block w-px h-5 bg-(--border) mx-1" />
                <ThemeToggle />

                {/* User chip */}
                <div className="flex items-center gap-2 pl-2">
                  <div className="hidden sm:flex flex-col items-end leading-tight">
                    <span className="text-xs font-medium text-(--text-primary)">
                      {profile.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-(--text-muted)">
                      {profile.isManager ? "Manager" : "Sales"}
                    </span>
                  </div>
                  <form action={signOut}>
                    <button
                      type="submit"
                      title="Sign out"
                      className="w-9 h-9 flex items-center justify-center rounded-md text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--accent)/10 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </header>
        )}
        <main className="flex-1">{children}</main>
        {profile && (
          <footer className="border-t border-(--border) bg-(--surface)">
            <div className="max-w-7xl mx-auto px-6 h-10 flex items-center">
              <p className="text-xs text-(--text-muted)">
                &copy; 2026 Servian Contracting. All rights reserved.
              </p>
            </div>
          </footer>
        )}
      </body>
    </html>
  );
}
