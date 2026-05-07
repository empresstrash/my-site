"use client";

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(false);
  const paragraphUrl = 'https://paragraph.com/@empresstrash';

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
            src={paragraphUrl}
            title="paragraph.com/@empresstrash mobile"
            style={{ position: 'absolute', top: 0, left: 0, width: 'calc(100% + 20px)', height: '100%', border: 'none' }}
            loading="lazy"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <iframe
        src={paragraphUrl}
        title="paragraph.com/@empresstrash"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        loading="lazy"
        allowFullScreen
      />
      <style jsx>{`
        .page-container {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
