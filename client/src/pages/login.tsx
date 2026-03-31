import { useState, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInEmailError, setSignInEmailError] = useState<string | null>(null);
  const [signUpEmailError, setSignUpEmailError] = useState<string | null>(null);
  const [signInPasswordError, setSignInPasswordError] = useState<string | null>(null);
  const [signUpPasswordError, setSignUpPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { login, requestPasswordReset, signUp } = useAuth();
  const { t } = useI18n();

  const onSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInEmailError(null);
    setSignInPasswordError(null);
    setIsSubmitting(true);

    if (!isValidEmail(email)) {
      setSignInEmailError(t("auth.emailInvalid"));
      toast({
        variant: "destructive",
        title: t("auth.emailInvalid"),
      });
      setIsSubmitting(false);
      return;
    }

    if (password.length < 7) {
      setSignInPasswordError(t("auth.passwordTooShort"));
      toast({
        variant: "destructive",
        title: t("auth.passwordTooShort"),
      });
      setIsSubmitting(false);
      return;
    }

    const result = await login(email, password);
    if (result.ok) {
      toast({ title: t("auth.loginSuccess") });
      setLocation("/");
      setIsSubmitting(false);
      return;
    }

    toast({
      variant: "destructive",
      title: result.error || t("auth.loginError"),
    });
    setIsSubmitting(false);
  };

  const onSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignUpEmailError(null);
    setSignUpPasswordError(null);
    setIsSubmitting(true);

    if (!isValidEmail(email)) {
      setSignUpEmailError(t("auth.emailInvalid"));
      toast({
        variant: "destructive",
        title: t("auth.emailInvalid"),
      });
      setIsSubmitting(false);
      return;
    }

    if (password.length < 7) {
      setSignUpPasswordError(t("auth.passwordTooShort"));
      toast({
        variant: "destructive",
        title: t("auth.passwordTooShort"),
      });
      setIsSubmitting(false);
      return;
    }

    const result = await signUp(email, password);
    if (result.ok) {
      if (result.hasSession) {
        toast({
          title: t("auth.signUpSuccess"),
        });

        // Session exists immediately -> go to dashboard.
        setLocation("/");
      } else {
        setActiveTab("signin");
        toast({
          title: t("auth.signUpCheckEmail"),
          description: t("auth.signUpConfirmEmailMessage"),
        });
      }

      if (!result.hasSession) {
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      return;
    }

    toast({
      variant: "destructive",
      title: t("auth.signUpError"),
      description: result.error,
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
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("auth.title")}</CardTitle>
            <CardDescription>
              {activeTab === "signup" ? t("auth.signUpSubtitle") : t("auth.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as "signin" | "signup");
                setSignInEmailError(null);
                setSignUpEmailError(null);
                setSignInPasswordError(null);
                setSignUpPasswordError(null);
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t("auth.tabSignIn")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.tabSignUp")}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4">
                <form onSubmit={onSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (signInEmailError) setSignInEmailError(null);
                      }}
                      data-testid="input-login-email"
                      className={signInEmailError ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {signInEmailError ? (
                      <p className="text-sm text-destructive">{signInEmailError}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{t("auth.password")}</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (signInPasswordError) setSignInPasswordError(null);
                      }}
                      data-testid="input-login-password"
                      className={signInPasswordError ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {signInPasswordError ? (
                      <p className="text-sm text-destructive">{signInPasswordError}</p>
                    ) : null}
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
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={onSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">{t("auth.email")}</Label>
                    <Input
                      id="email-signup"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (signUpEmailError) setSignUpEmailError(null);
                      }}
                      data-testid="input-signup-email"
                      className={signUpEmailError ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {signUpEmailError ? (
                      <p className="text-sm text-destructive">{signUpEmailError}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">{t("auth.password")}</Label>
                    <Input
                      id="password-signup"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (signUpPasswordError) setSignUpPasswordError(null);
                      }}
                      data-testid="input-signup-password"
                      className={signUpPasswordError ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {signUpPasswordError ? (
                      <p className="text-sm text-destructive">{signUpPasswordError}</p>
                    ) : null}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                    data-testid="button-signup-submit"
                  >
                    {t("auth.signUpButton")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
