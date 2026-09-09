import './globals.css';
import ClientMenu from './components/ClientMenu';
import { Barlow } from 'next/font/google';

/** Menu sans — loaded via next/font so it actually applies (CSS @import was easy to miss). */
const menuSans = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-barlow',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Server component: interactive state lives in `ClientMenu`.

  return (
    <html lang="en" className={menuSans.variable}>
      <head>
        <title>empress trash's super site</title>
        <link rel="icon" href="/crown-favicon.png" type="image/png" sizes="64x64" />
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
      </head>
      <body>
        <ClientMenu />
        <main className="content">{children}</main>
      </body>
    </html>
  );
}