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
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
