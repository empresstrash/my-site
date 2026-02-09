import './globals.css';
import { Poppins, Metrophobic } from 'next/font/google';
import ClientMenu from './components/ClientMenu';

const poppins = Poppins({ subsets: ['latin'], weight: '700' });
const metrophobic = Metrophobic({ subsets: ['latin'], weight: '400' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Server component: interactive state lives in `ClientMenu`.

  return (
    <html lang="en">
      <head>
        <title>empress trash's super site</title>
      </head>
      <body className={`${poppins.className} ${metrophobic.className}`}>
        <ClientMenu />

        
        <div className="bottom-bar"></div>
        <main className="content">{children}</main>
      </body>
    </html>
  );
}