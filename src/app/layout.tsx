import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ContractCore',
    template: '%s — ContractCore',
  },
  description: 'ContractCore — Contratos Inteligentes. Governança Completa.',
  keywords: ['contratos', 'psicologia', 'prestação de serviços', 'LGPD', 'CFP'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: '!font-sans !text-sm !rounded-xl !shadow-card-md',
            success: { className: '!bg-emerald-600 !text-white' },
            error:   { className: '!bg-red-600 !text-white' },
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
