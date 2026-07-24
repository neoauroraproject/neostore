export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Georgia, serif', margin: 0, background: '#f6f1ea', color: '#1a1a1a' }}>
        {children}
      </body>
    </html>
  );
}
