import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { ApolloWrapper } from "@/lib/ApolloWrapper";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// KAN-257: o layout raiz só tinha title/description genéricos — sem
// `metadataBase` (o que faz o Next resolver URLs relativas contra localhost/URL
// de preview) e sem OpenGraph default, então a home não tinha preview de
// compartilhamento. As páginas de loja já têm OG próprio via generateMetadata.
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://shopping.bcmtech.com.br",
  ),
  title: {
    default: "BCM Shopping",
    template: "%s | BCM Shopping",
  },
  description: "Compre direto da sua loja favorita",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "BCM Shopping",
    title: "BCM Shopping",
    description: "Compre direto da sua loja favorita",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* KAN-257: o ThemeProvider só aplica a classe `dark` depois do mount,
            o que causa um flash de tema no primeiro paint. Este script roda
            antes da hidratação e resolve o FOUC — mesmo padrão já usado no
            vendor-panel. É estático (sem entrada de usuário), então não é XSS. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('themeMode')||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ApolloWrapper>{children}</ApolloWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
