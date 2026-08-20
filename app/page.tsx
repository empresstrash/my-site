'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Paragraph serves some posts (e.g. damsels-part-deux) as text/markdown by default,
 * which makes iframes show raw markdown. ?format=html forces the real Next.js page
 * so every article embeds with the same native Paragraph UI.
 */
function toParagraphEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('format', 'html');
    return parsed.toString();
  } catch {
    return url;
  }
}

function HomeContent() {
  const [isMobile, setIsMobile] = useState(false);
  const searchParams = useSearchParams();
  const paragraphUrl = useMemo(() => {
    const defaultUrl = 'https://paragraph.com/@empresstrash';
    const requestedUrl = searchParams.get('paragraph');

    if (!requestedUrl) {
      return defaultUrl;
    }

    try {
      const parsedUrl = new URL(requestedUrl);
      const validOrigin = parsedUrl.origin === 'https://paragraph.com';
      const validPath = parsedUrl.pathname.toLowerCase().startsWith('/@empresstrash');

      if (validOrigin && validPath) {
        return parsedUrl.toString();
      }
    } catch {
      return defaultUrl;
    }

    return defaultUrl;
  }, [searchParams]);

  const embedSrc = useMemo(() => toParagraphEmbedUrl(paragraphUrl), [paragraphUrl]);

  useEffect(() => {
    function update() {
      setIsMobile(window.innerWidth < 769);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, []);

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
        <a
          className="embed-open-button"
          href={paragraphUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', textAlign: 'center', padding: '0.35rem 0.75rem', fontSize: '0.92rem', marginBottom: '0.5rem', flexShrink: 0 }}
        >
          View blog in new tab
        </a>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <iframe
            src={embedSrc}
            style={{ position: 'absolute', top: 0, left: 0, width: 'calc(100% + 20px)', height: '100%', border: 'none' }}
            loading="lazy"
            allowFullScreen
            title="Paragraph Blog Mobile"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="paragraph-container">
      <iframe
        src={embedSrc}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        loading="lazy"
        allowFullScreen
        title="Paragraph Blog"
      />
      <style jsx>{`
        .paragraph-container {
          overflow: hidden;
          height: 100%;
          position: relative;
          width: 100%;
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
