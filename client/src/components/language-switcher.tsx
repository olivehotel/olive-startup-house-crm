import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useI18n();

  return (
    <div className={cn("inline-flex items-center rounded-md border border-border p-1", className)}>
      <Button
        size="sm"
        variant={language === "en" ? "default" : "ghost"}
        onClick={() => setLanguage("en")}
        data-testid="button-language-en"
      >
        EN
      </Button>
      <Button
        size="sm"
        variant={language === "ru" ? "default" : "ghost"}
        onClick={() => setLanguage("ru")}
        data-testid="button-language-ru"
      >
        RU
      </Button>
    </div>
  );
}
