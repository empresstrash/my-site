import './globals.css';
import ClientMenu from './components/ClientMenu';
import { Barlow } from 'next/font/google';
import { headers } from 'next/headers';

/** Menu sans — loaded via next/font so it actually applies (CSS @import was easy to miss). */
const menuSans = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-barlow',
  display: 'swap',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get('x-pathname') ?? '';
  const booth = path === '/vr' || path.startsWith('/vr/');

  return (
    <html lang="en" className={`${menuSans.variable}${booth ? ' pvr-still' : ''}`}>
      <head>
        <title>empress trash's super site</title>
        <link rel="icon" href="/crown-favicon.png" type="image/png" sizes="64x64" />
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
        <style
          dangerouslySetInnerHTML={{
            __html:
              'html,body{background:#000;color:#fff}html.pvr-still,html.pvr-still *{animation:none!important;transition:none!important}',
          }}
        />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var path=location.pathname||'';if(path==='/vr'||path.indexOf('/vr/')===0){document.documentElement.classList.add('pvr-still');return;}var ua=navigator.userAgent||'';if(/OculusBrowser/i.test(ua))return;if(/;\\s*wv\\)|CEF\\/|Vuplex/i.test(ua)||/Quest/i.test(ua)||(/Android/i.test(ua)&&/Version\\/4\\.0/i.test(ua)))document.documentElement.classList.add('pvr-still');}catch(e){}})();",
          }}
        />
        <ClientMenu />
        <main className="content">{children}</main>
      </body>
    </html>
  );
}