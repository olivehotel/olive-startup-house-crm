import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  ClipboardCheck,
  UserPlus,
  Calendar,
  Building2,
  DollarSign,
  Settings,
  HelpCircle,
  Leaf,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    highlight: false,
  },
  {
    title: "Lead Pipeline",
    url: "/leads",
    icon: Users,
    highlight: false,
  },
  {
    title: "Communication",
    url: "/communication",
    icon: MessageSquare,
    highlight: true,
  },
  {
    title: "Screening",
    url: "/screening",
    icon: ClipboardCheck,
    highlight: false,
  },
  {
    title: "Onboarding",
    url: "/onboarding",
    icon: UserPlus,
    highlight: false,
  },
];

const operationsItems = [
  {
    title: "EcoSmart",
    url: "/ecosmart",
    icon: Calendar,
    highlight: true,
  },
  {
    title: "Properties",
    url: "/properties",
    icon: Building2,
    highlight: false,
  },
  {
    title: "Community Hub",
    url: "/community",
    icon: Users,
    highlight: false,
  },
  {
    title: "Financial Reports",
    url: "/financials",
    icon: DollarSign,
    highlight: false,
  },
];

const bottomItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Help & Support",
    url: "/help",
    icon: HelpCircle,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { userEmail, userName } = useAuth();
  const displayName = userName ?? (userEmail ? userEmail.split("@")[0] : "");
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3" data-testid="link-logo">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-sidebar-foreground">Olive Startup House</span>
            <span className="text-xs text-muted-foreground">Automation Suite</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className={item.highlight ? "font-semibold text-primary" : ""}
                  >
                    <Link href={item.url}>
                      <item.icon className={`h-4 w-4${item.highlight ? " text-primary" : ""}`} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className={item.highlight ? "font-semibold text-primary" : ""}
                  >
                    <Link href={item.url}>
                      <item.icon className={`h-4 w-4${item.highlight ? " text-primary" : ""}`} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
