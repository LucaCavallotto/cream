import { useLayoutEffect, useRef } from 'react';
import { formatMoney } from '../../assets/js/money.js';

// Keep every currency token on one baseline, with consistent visual spacing.
export default function Money({ value, signed = false, formatted, fit = false }) {
  const text = formatted ?? formatMoney(value, signed);
  const parts = text.match(/^([+−-]?)(€)(.*)$/);
  const amount = useRef(null);
  useLayoutEffect(() => {
    if (!fit || !amount.current) return;
    const element = amount.current, container = element.parentElement;
    const resize = () => {
      if (!container.clientWidth) return;
      // Measure at the normal inherited size; shrink only overflowing totals.
      element.style.removeProperty('font-size');
      const style = getComputedStyle(container);
      const available = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const width = element.getBoundingClientRect().width;
      if (available > 0 && width > available) {
        const size = parseFloat(getComputedStyle(element).fontSize);
        element.style.fontSize = `${size * Math.max(available - 1, 0) / width}px`;
      }
    };
    resize();
    let frame;
    // Apply observer-driven changes in the next frame, outside its delivery loop.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      element.style.removeProperty('font-size');
    };
  }, [fit, text]);
  if (!parts) return text;
  return <span ref={amount} className={`money-amount${fit ? ' money-fit' : ''}`}>
    {parts[1] && <span className="money-sign">{parts[1]}</span>}
    <span className="money-currency">{parts[2]}</span>
    <span className="money-number">{parts[3]}</span>
  </span>;
}
