import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "./components/ThemeToggle";

export const metadata: Metadata = {
  title: "Virtual OTP System",
  description: "Secure multi-user virtual numbers & OTP receiving platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="theme-dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('otp-theme');if(t==='light'){document.documentElement.classList.add('theme-light');document.documentElement.classList.remove('theme-dark');document.documentElement.setAttribute('data-theme','light');}else{document.documentElement.classList.add('theme-dark');document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <div className="public-theme-toggle fixed right-4 top-4 z-[60]">
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
