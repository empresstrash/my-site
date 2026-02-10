"use client";

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function update() {
      setIsMobile(window.innerWidth < 769);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (isMobile) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: 'var(--color-text)', marginBottom: 12 }}>my blog on mobile works better if open in new tab</p>
        <a className="embed-open-button" href="https://paragraph.com/@empresstrash" target="_blank" rel="noopener noreferrer">Open paragraph.com</a>
      </div>
    );
  }

  return (
    <div className="page-container">
      <iframe
        src="https://paragraph.com/@empresstrash"
        frameBorder="0"
        title="paragraph.com/@empresstrash"
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        loading="lazy"
        allowFullScreen
      />
      <style jsx>{`
        .page-container {
          position: relative;
          top: 0;
          left: 0;
          width: 100%;
          height: calc(100vh - 64px);
          overflow: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .page-container::-webkit-scrollbar {
          width: 0;
          height: 0;
        }
      `}</style>
    </div>
  );
}
