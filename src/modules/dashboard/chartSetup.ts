import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
);

export const DASHBOARD_CHART_COLORS = [
  "#22d3ee",
  "#fb923c",
  "#a3e635",
  "#facc15",
  "#f472b6",
  "#818cf8",
  "#14b8a6",
] as const;

export function chartAnimation(
  reducedMotion: boolean | null,
): false | { duration: number; easing: "easeOutQuart" } {
  if (reducedMotion) return false;
  return { duration: 850, easing: "easeOutQuart" };
}

export function getDashboardChartTheme(): {
  border: string;
  grid: string;
  surface: string;
  text: string;
} {
  if (typeof window === "undefined") {
    return {
      border: "rgba(148, 163, 184, 0.24)",
      grid: "rgba(148, 163, 184, 0.16)",
      surface: "rgba(2, 6, 23, 0.92)",
      text: "rgba(226, 232, 240, 0.82)",
    };
  }

  const styles = window.getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  return {
    border: read("--border", "rgba(148, 163, 184, 0.24)"),
    grid: read("--border-38", "rgba(148, 163, 184, 0.16)"),
    surface: read("--background", "rgba(2, 6, 23, 0.92)"),
    text: read("--muted-foreground", "rgba(226, 232, 240, 0.82)"),
  };
}
