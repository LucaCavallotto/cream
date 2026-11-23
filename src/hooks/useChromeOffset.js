import { useLayoutEffect } from 'react';

// Header stays sticky; the ticker contributes only while it remains below it.
export default function useChromeOffset(chrome, sessionId) {
  useLayoutEffect(() => {
    const header = chrome.current;
    const ticker = header?.nextElementSibling;
    if (!header || !ticker) return;
    const root = document.documentElement;
    let frame;
    const measure = () => {
      const headerHeight = header.getBoundingClientRect().height;
      const tickerBounds = ticker.getBoundingClientRect();
      // Safari can report geometry beyond the document bounds during elastic scrolling.
      const visibleTicker = Math.min(tickerBounds.height, Math.max(0, tickerBounds.bottom - headerHeight));
      const height = headerHeight + visibleTicker;
      root.style.setProperty('--chrome-height', `${height}px`);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(header);
    observer.observe(ticker);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
      root.style.removeProperty('--chrome-height');
    };
  }, [chrome, sessionId]);
}
