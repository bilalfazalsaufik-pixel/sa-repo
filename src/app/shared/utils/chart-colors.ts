const CHART_COLORS = [
  [54, 162, 235],  // Blue
  [255, 99, 132],  // Red
  [75, 192, 192],  // Teal
  [255, 206, 86],  // Yellow
  [153, 102, 255], // Purple
  [255, 159, 64]   // Orange
];

export function getChartColor(index: number, alpha: number = 1): string {
  const [r, g, b] = CHART_COLORS[index % CHART_COLORS.length];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
