import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { chartConfig } from '../../assets/js/analyticsModel.js';

// Shared rendering and lifecycle for Overview and Analytics.
export default function AnalyticsChart({ type, model, active, theme, reducedMotion, id }) {
  const canvas = useRef(null), instance = useRef(null);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const config = chartConfig(type, model, { dark: theme === 'dark', reducedMotion, compact });
  useEffect(() => {
    const chart = new Chart(canvas.current, chartConfig(type, model, { dark: theme === 'dark', reducedMotion, compact }));
    instance.current = chart;
    setHiddenCategories([]);
    return () => { instance.current = null; chart.destroy(); };
  }, [type, model, theme, reducedMotion, compact]);
  useEffect(() => { if (active) instance.current?.resize(); }, [active]);
  return <><div className={`shared-chart chart-${type}`} style={{ aspectRatio: '2 / 1', position: 'relative' }}>
    <canvas ref={canvas} id={id} style={{ position: 'absolute', inset: 0 }} role="img"
      aria-label={type === 'pie' ? `Expenses by category: ${model.pie.map(([name]) => name).join(', ')}` : `Monthly cash flow: ${model.monthly.map(m => m.label).join(', ')}`} />
  </div>
    {type === 'pie' && <ul className="chart-category-legend" aria-label="Expense categories">
      {model.pie.map(([name], index) => <li key={name}><button type="button" aria-pressed={!hiddenCategories.includes(index)} onClick={() => {
        const chart = instance.current;
        if (!chart) return;
        chart.toggleDataVisibility(index);
        chart.update();
        setHiddenCategories(previous => previous.includes(index) ? previous.filter(value => value !== index) : [...previous, index]);
      }}>
        <span aria-hidden="true" style={{ backgroundColor: config.data.datasets[0].backgroundColor[index % config.data.datasets[0].backgroundColor.length] }} />{name}</button>
      </li>)}
    </ul>}
  </>;
}
