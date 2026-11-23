import Money from './Money.jsx';
import Star from './Star.jsx';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { datasetTicker } from '../../assets/js/presentation.js';

const PIXELS_PER_SECOND = 40;

const welcome = [
  { key: 'local', label: 'LOCAL CSV', value: 'No uploads', tone: 'neutral' },
  { key: 'desktop', label: 'EDIT & SAVE', value: 'On a computer', tone: 'neutral' },
  { key: 'phone', label: 'SMARTPHONES', value: 'Read only', tone: 'neutral' },
];

export default function Ticker({ model, loaded }) {
  const [paused, setPaused] = useState(false);
  const [initialPhase] = useState(() => Math.random());
  const touchOrigin = useRef(null);
  const viewport = useRef(null), group = useRef(null);
  const [layout, setLayout] = useState({ repeats: 1, duration: 60 });
  const items = useMemo(() => loaded ? datasetTicker(model) : welcome, [loaded, model]);
  useLayoutEffect(() => {
    const measure = () => {
      if (!viewport.current || !group.current) return;
      const baseWidth = Array.from(group.current.children).slice(0, items.length)
        .reduce((width, item) => width + item.getBoundingClientRect().width, 0);
      if (!baseWidth) return;
      const repeats = Math.max(1, Math.ceil(viewport.current.clientWidth / baseWidth));
      // Each half fills the viewport. Translate one half at a constant 40px/s.
      const duration = baseWidth * repeats / PIXELS_PER_SECOND;
      setLayout(previous => previous.repeats === repeats && Math.abs(previous.duration - duration) < .001
        ? previous : { repeats, duration });
    };
    measure();
    let frame;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(viewport.current);
    observer.observe(group.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [items]);
  return (
    <section
      className={`money-ticker ${paused ? 'is-paused' : ''}`}
      aria-label="Dataset ticker"
    >
      <div
        ref={viewport}
        className="ticker-viewport"
        tabIndex={0}
        role="button"
        aria-label={paused ? 'Resume ticker' : 'Pause ticker'}
        aria-pressed={paused}
        aria-describedby="tickerSummary"
        onKeyDown={(event) => {
          if (['Enter', ' '].includes(event.key)) {
            event.preventDefault();
            setPaused(value => !value);
          }
        }}
        onClick={() => setPaused((value) => !value)}
        onTouchStart={(event) => {
          const touch = event.touches.length === 1 ? event.touches[0] : null;
          touchOrigin.current = touch ? [touch.clientX, touch.clientY] : null;
        }}
        onTouchCancel={() => {
          touchOrigin.current = null;
        }}
        onTouchEnd={(event) => {
          const origin = touchOrigin.current,
            touch = event.changedTouches[0];
          touchOrigin.current = null;
          if (
            !origin ||
            !touch ||
            event.touches.length ||
            Math.hypot(touch.clientX - origin[0], touch.clientY - origin[1]) >
              10
          )
            return;
          // Safari can suppress the synthetic click just after scrolling. Handle
          // a completed tap once, without toggling on a swipe or a pinch.
          event.preventDefault();
          setPaused((value) => !value);
        }}
      >
        <div className="ticker-track" aria-live="off" style={{ '--ticker-distance': `${layout.duration * PIXELS_PER_SECOND}px`, '--ticker-duration': `${layout.duration}s`, '--ticker-delay': `${-initialPhase * layout.duration}s` }}>
          {[0, 1].map((copy) => (
            <ul
              ref={copy === 0 ? group : undefined}
              className="ticker-group"
              id={copy === 0 ? 'tickerSummary' : undefined}
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {Array.from({ length: layout.repeats }, (_, repetition) => items.map((item) => (
                <li key={`${repetition}:${item.key}`} aria-hidden={repetition > 0 ? true : undefined}>
                  <span className="ticker-label">{item.label}</span>
                  <span className={`ticker-value tone-${item.tone}`}>
                    {item.tone !== 'neutral' && (
                      <span aria-hidden="true">
                        {item.tone === 'positive' ? '↗' : '↘'}{' '}
                      </span>
                    )}
                    <Money formatted={item.value} />
                  </span>
                  <span className="ticker-separator" aria-hidden="true">
                    <Star />
                  </span>
                </li>
              )))}
            </ul>
          ))}
        </div>
      </div>

    </section>
  );
}
