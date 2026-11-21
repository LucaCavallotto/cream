import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { chartConfig } from '../../assets/js/analyticsModel.js';

// Shared rendering and lifecycle for Overview and Analytics.
export default function AnalyticsChart({ type, model, active, theme, reducedMotion, id }) {
  const canvas = useRef(null), instance = useRef(null);
  useEffect(() => {
    const chart = new Chart(canvas.current, chartConfig(type, model, { dark: theme === 'dark', reducedMotion }));
    instance.current = chart;
    return () => { instance.current = null; chart.destroy(); };
  }, [type, model, theme, reducedMotion]);
  useEffect(() => { if (active) instance.current?.resize(); }, [active]);
  return <div className="shared-chart" style={{ aspectRatio: '2 / 1', position: 'relative' }}>
    <canvas ref={canvas} id={id} style={{ position: 'absolute', inset: 0 }} role="img"
      aria-label={type === 'pie' ? `Expenses by category: ${model.pie.map(([name]) => name).join(', ')}` : `Monthly cash flow: ${model.monthly.map(m => m.label).join(', ')}`} />
  </div>;
}
