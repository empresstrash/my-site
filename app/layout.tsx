import './globals.css';
import ClientMenu from './components/ClientMenu';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Server component: interactive state lives in `ClientMenu`.

  return (
    <html lang="en">
      <head>
        <title>empress trash's super site</title>
      </head>
      <body>
        <ClientMenu />
        <main className="content">{children}</main>
      </body>
    </html>
  );
}