import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/web/components/providers';

export const metadata: Metadata = {
  title: 'Sistema de Almoxarifado',
  description: 'Sistema web e mobile integrado para gestão de almoxarifado',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('almoxarifado_theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = stored ? (stored === 'dark') : prefersDark;
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

