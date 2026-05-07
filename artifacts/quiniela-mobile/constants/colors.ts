export type PrimaryColor = "verde" | "rojo" | "naranja" | "azul";
export type ThemeMode = "dark" | "light";

export const PRIMARY_HEX: Record<PrimaryColor, string> = {
  verde:   "#00d896",
  rojo:    "#ef4444",
  naranja: "#f97316",
  azul:    "#3b82f6",
};

export const PRIMARY_FG: Record<PrimaryColor, string> = {
  verde:   "#002e1a",
  rojo:    "#ffffff",
  naranja: "#ffffff",
  azul:    "#ffffff",
};

export const PRIMARY_LABEL: Record<PrimaryColor, string> = {
  verde:   "Verde",
  rojo:    "Rojo",
  naranja: "Naranja",
  azul:    "Azul",
};

export function buildTheme(mode: ThemeMode, primary: PrimaryColor) {
  const isDark = mode === "dark";
  const p = PRIMARY_HEX[primary];
  const pFg = PRIMARY_FG[primary];
  return {
    background:      isDark ? "#060e1a" : "#f1f5f9",
    card:            isDark ? "#0d1c30" : "#ffffff",
    surface2:        isDark ? "#0b1628" : "#f8fafc",
    surface3:        isDark ? "#111f35" : "#e2e8f0",
    muted:           isDark ? "#0b1628" : "#f1f5f9",
    foreground:      isDark ? "#dbeafe" : "#0f172a",
    cardForeground:  isDark ? "#dbeafe" : "#0f172a",
    mutedForeground: isDark ? "#4e6e8a" : "#64748b",
    border:          isDark ? "rgba(30,70,120,0.45)" : "rgba(148,163,184,0.4)",
    input:           isDark ? "rgba(30,70,120,0.6)"  : "rgba(148,163,184,0.6)",
    primary:         p,
    primaryForeground: pFg,
    gold:            "#fbbf24",
    live:            "#ff4444",
    destructive:     "#ef4444",
    destructiveForeground: "#ffffff",
    text:            isDark ? "#dbeafe" : "#0f172a",
    tint:            p,
    radius:          8,
  };
}

const darkTheme = buildTheme("dark", "verde");
const colors = { light: darkTheme, dark: darkTheme, radius: 8 };
export default colors;
