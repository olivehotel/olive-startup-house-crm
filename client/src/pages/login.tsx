import { useState, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { login, requestPasswordReset } = useAuth();
  const { t } = useI18n();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await login(email, password);
    if (result.ok) {
      toast({ title: t("auth.loginSuccess") });
      setIsSubmitting(false);
      return;
    }

    toast({
      variant: "destructive",
      title: result.error || t("auth.loginError"),
    });
    setIsSubmitting(false);
  };

  const onForgotPassword = async () => {
    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: t("auth.forgotPasswordEnterEmail"),
      });
      return;
    }

    const result = await requestPasswordReset(email);
    if (!result.ok) {
      toast({
        variant: "destructive",
        title: t("auth.forgotPasswordError"),
        description: result.error,
      });
      return;
    }

    toast({
      title: t("auth.forgotPassword"),
      description: t("auth.forgotPasswordMessage"),
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-5xl justify-end">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-5xl items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("auth.title")}</CardTitle>
            <CardDescription>{t("auth.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  data-testid="input-login-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  data-testid="input-login-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-login-submit"
              >
                {t("auth.login")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={onForgotPassword}
                data-testid="button-login-forgot-password"
              >
                {t("auth.forgotPassword")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
