import { createContext, useContext, useMemo, type ReactNode } from "react";

export type Language = "en";

type TranslationKey =
  | "auth.title"
  | "auth.subtitle"
  | "auth.email"
  | "auth.password"
  | "auth.login"
  | "auth.tabSignIn"
  | "auth.tabSignUp"
  | "auth.passwordTooShort"
  | "auth.signUpSubtitle"
  | "auth.signUpButton"
  | "auth.signUpSuccess"
  | "auth.signUpCheckEmail"
  | "auth.signUpConfirmEmailMessage"
  | "auth.signUpError"
  | "auth.forgotPassword"
  | "auth.forgotPasswordMessage"
  | "auth.forgotPasswordEnterEmail"
  | "auth.emailInvalid"
  | "auth.loginSuccess"
  | "auth.loginError"
  | "auth.forgotPasswordError"
  | "header.appName"
  | "header.logout";

const dictionary: Record<TranslationKey, string> = {
  "auth.title": "Authorization",
  "auth.subtitle": "Sign in to continue",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.login": "Log in",
  "auth.tabSignIn": "Sign In",
  "auth.tabSignUp": "Sign Up",
  "auth.passwordTooShort": "Password must be at least 7 characters",
  "auth.signUpSubtitle": "Create an account to continue",
  "auth.signUpButton": "Create account",
  "auth.signUpSuccess": "Signed up successfully",
  "auth.signUpCheckEmail": "Check your email",
  "auth.signUpConfirmEmailMessage": "We sent you a link for authorization.",
  "auth.signUpError": "Unable to create account",
  "auth.forgotPassword": "Forgot password?",
  "auth.forgotPasswordMessage": "Password reset will be available after backend integration.",
  "auth.forgotPasswordEnterEmail": "Enter your email first",
  "auth.emailInvalid": "Please enter a valid email address",
  "auth.loginSuccess": "Logged in successfully",
  "auth.loginError": "Please enter a valid email and password",
  "auth.forgotPasswordError": "Unable to send reset email",
  "header.appName": "Olive Startup House",
  "header.logout": "Log out",
};

type I18nContextValue = {
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const value = useMemo<I18nContextValue>(
    () => ({
      t: (key) => dictionary[key],
    }),
    [],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
