import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LeadsPage from "@/pages/leads";
import CommunicationPage from "@/pages/communication";
import CommunicationMessagesPage from "@/pages/communication-messages";
import ScreeningPage from "@/pages/screening";
import OnboardingPage from "@/pages/onboarding";
import EcoSmartPage from "@/pages/ecosmart";
import PropertiesPage from "@/pages/properties";
import CommunityPage from "@/pages/community";
import FinancialsPage from "@/pages/financials";
import SettingsPage from "@/pages/settings";
import HelpPage from "@/pages/help";
import LoginPage from "@/pages/login";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthProvider, useAuth } from "@/lib/auth";
import { I18nProvider, useI18n } from "@/lib/i18n";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/communication" component={CommunicationPage} />
      <Route path="/communication/:id" component={CommunicationMessagesPage} />
      <Route path="/screening" component={ScreeningPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/ecosmart" component={EcoSmartPage} />
      <Route path="/properties" component={PropertiesPage} />
      <Route path="/community" component={CommunityPage} />
      <Route path="/financials" component={FinancialsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/help" component={HelpPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isAuthLoading, logout } = useAuth();
  const { t } = useI18n();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-background shrink-0">
                <div className="flex items-center gap-2">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <h1 className="text-sm font-medium text-muted-foreground hidden sm:block">
                    {t("header.appName")}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={logout}
                    data-testid="button-logout"
                  >
                    {t("header.logout")}
                  </Button>
                </div>
              </header>
              <ScrollArea className="flex-1">
                <main className="min-h-full">
                  <Router />
                </main>
              </ScrollArea>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
