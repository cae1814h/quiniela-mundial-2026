import { buildTheme } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const { primaryColor, mode } = useTheme();
  return buildTheme(mode, primaryColor);
}
