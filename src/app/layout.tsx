import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Swerank - Live Svensk Vattenskidranking',
  description: 'Live uppdaterad svensk vattenskidranking baserad på IWWF EMS tävlingsresultat från de senaste 12 månaderna.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        <Navbar />
        
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        
        <footer className="border-t border-border bg-card py-6 text-center text-xs text-muted transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              &copy; {new Date().getFullYear()} Swerank. Alla rättigheter förbehållna.
            </p>
            <p>
              Rankingsystemet bygger uteslutande på data hämtad live från{' '}
              <a 
                href="https://ems.iwwf.sport" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                IWWF EMS
              </a>.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
