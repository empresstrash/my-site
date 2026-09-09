'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type HomeView = 'paragraph' | 'emporium';

const DEFAULT_PARAGRAPH = 'https://paragraph.com/@empresstrash';

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

function parseHomeView(value: string | null): HomeView {
  return value === 'emporium' ? 'emporium' : 'paragraph';
}

function HomeContent() {
  const [isMobile, setIsMobile] = useState(false);
  const [visited, setVisited] = useState<Record<HomeView, boolean>>({
    paragraph: true,
    emporium: false,
  });
  const searchParams = useSearchParams();
  const view = parseHomeView(searchParams.get('embed'));

  const paragraphUrl = useMemo(() => {
    const requestedUrl = searchParams.get('paragraph');
    if (!requestedUrl) return DEFAULT_PARAGRAPH;

    try {
      const parsedUrl = new URL(requestedUrl);
      const validOrigin = parsedUrl.origin === 'https://paragraph.com';
      const validPath = parsedUrl.pathname.toLowerCase().startsWith('/@empresstrash');
      if (validOrigin && validPath) return parsedUrl.toString();
    } catch {
      return DEFAULT_PARAGRAPH;
    }

    return DEFAULT_PARAGRAPH;
  }, [searchParams]);

  const paragraphSrc = useMemo(() => toParagraphEmbedUrl(paragraphUrl), [paragraphUrl]);

  useEffect(() => {
    setVisited((prev) => (prev[view] ? prev : { ...prev, [view]: true }));
  }, [view]);

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

  const tabHref = (id: HomeView) => {
    const params = new URLSearchParams();
    if (id !== 'paragraph') params.set('embed', id);
    if (paragraphUrl !== DEFAULT_PARAGRAPH) params.set('paragraph', paragraphUrl);
    const query = params.toString();
    return query ? `/?${query}` : '/';
  };

  const paragraphFrameClass = isMobile ? 'home-embed-frame is-mobile' : 'home-embed-frame';

  return (
    <div className="home-embed">
      <nav className="home-embed-tabs" role="tablist" aria-label="homepage embeds">
        <Link
          href={tabHref('paragraph')}
          role="tab"
          aria-selected={view === 'paragraph'}
          className={`home-embed-tab${view === 'paragraph' ? ' is-on' : ''}`}
          scroll={false}
        >
          paragraph blog
        </Link>
        <Link
          href={tabHref('emporium')}
          role="tab"
          aria-selected={view === 'emporium'}
          className={`home-embed-tab${view === 'emporium' ? ' is-on' : ''}`}
          scroll={false}
        >
          emporium shop
        </Link>
      </nav>

      <div className="home-embed-stage">
        {visited.paragraph && (
          <div
            className="home-embed-pane"
            role="tabpanel"
            hidden={view !== 'paragraph'}
            aria-hidden={view !== 'paragraph'}
          >
            <iframe
              src={paragraphSrc}
              className={paragraphFrameClass}
              loading="eager"
              allowFullScreen
              title="Paragraph blog"
            />
          </div>
        )}

        {visited.emporium && (
          <div
            className="home-embed-pane"
            role="tabpanel"
            hidden={view !== 'emporium'}
            aria-hidden={view !== 'emporium'}
          >
            <iframe
              src="/frame/emporium"
              className="home-embed-frame"
              allow="payment *; fullscreen *"
              allowFullScreen
              title="Emporium shop"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function HomeFallback() {
  return (
    <div className="home-embed">
      <nav className="home-embed-tabs" aria-hidden="true">
        <span className="home-embed-tab is-on">paragraph blog</span>
        <span className="home-embed-tab">emporium shop</span>
      </nav>
      <div className="home-embed-stage">
        <iframe
          src={`${DEFAULT_PARAGRAPH}?format=html`}
          className="home-embed-frame"
          title="Paragraph blog"
        />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}
