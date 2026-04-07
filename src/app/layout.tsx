import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/app/AppHeader";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontDisplay = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Control de afiliaciones",
  description: "Matriz por sede/seguro/especialista con vencimientos y renovaciones",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col text-zinc-900"
        suppressHydrationWarning
      >
        <a className="app-skip" href="#content">
          Saltar a contenido
        </a>
        <AppHeader />

        <main id="content" className="app-container app-main">
          <div className="app-fade-in">{children}</div>
        </main>
      </body>
    </html>
  );
}
