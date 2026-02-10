'use client';

import { useEffect, useState } from 'react';

export default function Home() {
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
    <div className="paragraph-container">
      <iframe
        src="https://paragraph.com/@empresstrash"
        style={{ 
          width: '100%', 
          height: '100%', 
          border: 'none',
          display: 'block'
        }}
        loading="lazy"
        allowFullScreen
        title="Paragraph Blog"
      />
      <style jsx>{`
        .paragraph-container {
          overflow: hidden;
          -webkit-overflow-scrolling: touch;
          height: calc(100vh - 64px);
          position: relative;
          width: 100%;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .paragraph-container::-webkit-scrollbar {
          width: 0;
          height: 0;
        }
      `}</style>
    </div>
  );
}