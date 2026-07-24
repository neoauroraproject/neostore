import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NeoStore Admin',
  description: 'Workspace admin console',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#0b0d10', color: '#e8eaed' }}>
        {children}
      </body>
    </html>
  );
}
