"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type ThemeMode = "system" | "light" | "dark";

interface ThemeContextData {
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextData>({
  isDark: false,
  mode: "system",
  setMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemDark, setSystemDark] = useState(false);

  // Carregar preferência e detectar tema do sistema
  useEffect(() => {
    const saved = localStorage.getItem("themeMode") as ThemeMode | null;
    if (saved === "light" || saved === "dark" || saved === "system") {
      setModeState(saved);
    }

    // Detectar tema do sistema
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Aplicar classe dark no document
  useEffect(() => {
    const shouldBeDark = mode === "dark" || (mode === "system" && systemDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [mode, systemDark]);

  const isDark = mode === "dark" || (mode === "system" && systemDark);

  // KAN-257: `setMode`/`toggleTheme` ainda nao sao consumidos por nenhum
  // componente — nao existe botao de tema no storefront. O provider NAO e
  // codigo morto (ele aplica a classe `dark` seguindo a preferencia do
  // sistema), entao foi mantido; o que faltava era o script inline no layout
  // para evitar o flash no primeiro paint, ja adicionado. Estas funcoes ficam
  // prontas para quando houver um toggle na UI.
  function setMode(newMode: ThemeMode) {
    setModeState(newMode);
    localStorage.setItem("themeMode", newMode);
  }

  function toggleTheme() {
    const next: ThemeMode = mode === "system" ? "dark" : mode === "dark" ? "light" : "system";
    setMode(next);
  }

  return (
    <ThemeContext.Provider value={{ isDark, mode, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
