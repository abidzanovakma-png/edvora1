import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setTheme, useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему";
  return (
    <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => setTheme(next)} aria-label={label} title={label}>
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
