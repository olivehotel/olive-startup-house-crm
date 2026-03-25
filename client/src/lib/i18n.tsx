import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Language = "en" | "ru";

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
  | "header.logout"
  | "language.english"
  | "language.russian";

const dictionary: Record<Language, Record<TranslationKey, string>> = {
  en: {
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
    "language.english": "English",
    "language.russian": "Russian",
  },
  ru: {
    "auth.title": "Авторизация",
    "auth.subtitle": "Войдите, чтобы продолжить",
    "auth.email": "Email",
    "auth.password": "Пароль",
    "auth.login": "Войти",
    "auth.tabSignIn": "Вход",
    "auth.tabSignUp": "Регистрация",
    "auth.passwordTooShort": "Пароль должен быть не короче 7 символов",
    "auth.signUpSubtitle": "Создайте аккаунт, чтобы продолжить",
    "auth.signUpButton": "Создать аккаунт",
    "auth.signUpSuccess": "Регистрация прошла успешно",
    "auth.signUpCheckEmail": "Проверьте почту",
    "auth.signUpConfirmEmailMessage": "Мы отправили вам ссылку для авторизации.",
    "auth.signUpError": "Не удалось создать аккаунт",
    "auth.forgotPassword": "Забыли пароль?",
    "auth.forgotPasswordMessage": "Сброс пароля будет доступен после интеграции бэкенда.",
    "auth.forgotPasswordEnterEmail": "Сначала введите email",
    "auth.emailInvalid": "Введите корректный email адрес",
    "auth.loginSuccess": "Вход выполнен успешно",
    "auth.loginError": "Введите корректные email и пароль",
    "auth.forgotPasswordError": "Не удалось отправить письмо для сброса",
    "header.appName": "Olive Startup House",
    "header.logout": "Выйти",
    "language.english": "Английский",
    "language.russian": "Русский",
  },
};

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "language";

function getInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "ru" ? "ru" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => dictionary[language][key],
    }),
    [language],
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
