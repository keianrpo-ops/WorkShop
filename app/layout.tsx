import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { Toaster } from 'sonner';
import { getWorkshopBusinessInfo } from '@/lib/workshop';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Workshop - ERP Automotriz para Talleres',
  description: 'Sistema para talleres en Colombia: recepcion, inventario, ventas, nomina, tesoreria, reportes y rentabilidad.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const business = await getWorkshopBusinessInfo();

  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AppShell business={business}>
          {children}
        </AppShell>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
