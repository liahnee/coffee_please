import { useState, useEffect } from "react";

type Theme = "light" | "dark";

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        // Check local storage first (manual override preference)
        const stored = localStorage.getItem("theme");
        if (stored === "light" || stored === "dark") return stored;

        // Check time: 7am (7) to 6pm (18) is Light, else Dark
        const hour = new Date().getHours();
        if (hour >= 7 && hour < 18) {
            return "light";
        }
        return "dark";
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark") {
            root.classList.add("dark");
            root.classList.remove("light");
        } else {
            root.classList.add("light");
            root.classList.remove("dark");
        }
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

    return { theme, toggleTheme };
}
