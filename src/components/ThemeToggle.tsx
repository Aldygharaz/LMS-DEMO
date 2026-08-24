import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className={`h-9 px-2.5 rounded-xl border border-border bg-background hover:bg-secondary text-xs font-semibold transition-all ${
        className || ""
      }`}
      title={isDark ? "Ganti ke Light Mode" : "Ganti ke Dark Mode"}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-[#FEE75C]">
          <Sun className="h-4 w-4" />
          <span className="hidden md:inline text-xs font-semibold text-foreground">Light</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-blue-600 dark:text-[#70B8FF]">
          <Moon className="h-4 w-4" />
          <span className="hidden md:inline text-xs font-semibold text-[#141414]">Dark</span>
        </div>
      )}
    </Button>
  );
}
