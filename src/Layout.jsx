import React from 'react';
import StudioFlowFloatingChat from '@/components/ai/StudioFlowFloatingChat';
import BottomNav from '@/components/ui/BottomNav';
import SplashCover from '@/components/layout/SplashCover';

export default function Layout({ children, currentPageName }) {

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&family=Playfair+Display:ital@1&display=swap');

        :root {
          --color-bg-main: #18151B;
          --color-bg-surface: #F6F1EC;
          --color-bg-card: #FCF8F4;
          --color-text-primary: #231F20;
          --color-text-secondary: #7A736C;
          --color-accent: #B89A66;
          --color-accent-soft: #E9DCC6;
          --color-border: #E6DDD2;
        }

        * {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 500;
        }

        html {
          background: var(--color-bg-main);
        }

        body {
          background: var(--color-bg-main);
          color: var(--color-text-primary);
        }

        h1, h2, h3, .font-display {
          font-family: 'Space Grotesk', 'Manrope', sans-serif;
          font-weight: 700;
          letter-spacing: -0.03em;
        }

        .font-brand-serif {
          font-family: 'Playfair Display', serif;
        }
      `}</style>
      <SplashCover />
      <div className="pb-24 md:pb-0">
        {children}
      </div>
      <BottomNav currentPage={currentPageName} />
      <StudioFlowFloatingChat />
    </>
  );
}