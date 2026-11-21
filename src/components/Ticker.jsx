import Star from './Star.jsx';
import { useRef, useState } from 'react';
import { datasetTicker } from '../../assets/js/presentation.js';

const welcome = [
  {
    key: 'private',
    label: 'PRIVATE BY DEFAULT',
    value: 'Always yours',
    tone: 'positive',
  },
  { key: 'local', label: 'LOCAL FILES', value: 'No uploads', tone: 'neutral' },
  {
    key: 'perspective',
    label: 'LESS NOISE',
    value: 'More perspective',
    tone: 'neutral',
  },
  {
    key: 'accounts',
    label: 'NO SIGN-UP',
    value: 'Just your money',
    tone: 'neutral',
  },
];

export default function Ticker({ model, loaded }) {
  const [paused, setPaused] = useState(false);
  const touchOrigin = useRef(null);
  const items = loaded ? datasetTicker(model) : welcome;
  return (
    <section
      className={`money-ticker ${paused ? 'is-paused' : ''}`}
      aria-label="Dataset ticker"
    >
      <div
        className="ticker-viewport"
        tabIndex={0}
        role="group"
        aria-label="Scrolling dataset summary"
      >
        <div className="ticker-track" aria-live="off">
          {[0, 1].map((copy) => (
            <ul
              className="ticker-group"
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {items.map((item) => (
                <li key={item.key}>
                  <span className="ticker-label">{item.label}</span>
                  <span className={`ticker-value tone-${item.tone}`}>
                    {item.tone !== 'neutral' && (
                      <span aria-hidden="true">
                        {item.tone === 'positive' ? '↗' : '↘'}{' '}
                      </span>
                    )}
                    {item.value}
                  </span>
                  <span className="ticker-separator" aria-hidden="true">
                    <Star />
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="ticker-pause"
        aria-label={paused ? 'Resume ticker' : 'Pause ticker'}
        aria-pressed={paused}
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
        <i
          className={`bi bi-${paused ? 'play' : 'pause'}-fill`}
          aria-hidden="true"
        />
      </button>
    </section>
  );
}
