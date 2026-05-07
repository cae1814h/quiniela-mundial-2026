import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type PrimaryColor = "verde" | "rojo" | "naranja" | "azul";
export type ThemeMode = "dark" | "light";

interface ThemeState {
  primaryColor: PrimaryColor;
  mode: ThemeMode;
  setPrimaryColor: (c: PrimaryColor) => void;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeState>({
  primaryColor: "verde",
  mode: "dark",
  setPrimaryColor: () => {},
  setMode: () => {},
});

const PRIMARY_KEY = "quiniela_primary_color";
const MODE_KEY = "quiniela_theme_mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [primaryColor, setPrimaryColorState] = useState<PrimaryColor>("verde");
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    (async () => {
      try {
        const [p, m] = await Promise.all([
          AsyncStorage.getItem(PRIMARY_KEY),
          AsyncStorage.getItem(MODE_KEY),
        ]);
        if (p) setPrimaryColorState(p as PrimaryColor);
        if (m) setModeState(m as ThemeMode);
      } catch {}
    })();
  }, []);

  const setPrimaryColor = useCallback((c: PrimaryColor) => {
    setPrimaryColorState(c);
    AsyncStorage.setItem(PRIMARY_KEY, c).catch(() => {});
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(MODE_KEY, m).catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ primaryColor, mode, setPrimaryColor, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
