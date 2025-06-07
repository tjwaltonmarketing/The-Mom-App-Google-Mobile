import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "blue-light-filter";

type ThemeProviderContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem("mom-app-theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme to document and save to localStorage
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove("dark", "blue-light-filter");
    
    // Apply new theme
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "blue-light-filter") {
      root.classList.add("blue-light-filter");
    }
    
    localStorage.setItem("mom-app-theme", theme);
  }, [theme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}