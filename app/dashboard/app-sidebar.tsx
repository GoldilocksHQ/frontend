import { Home, User, Inbox, Plug } from "lucide-react"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  // SidebarGroup,
  // SidebarGroupContent,
  // SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"

// Menu items.
const items = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Connectors",
    url: "/dashboard/connectors",
    icon: Plug,
  },
  {
    title: "Playground",
    url: "/dashboard/playground",
    icon: Inbox,
  },
  {
    title: "Account",
    url: "/dashboard/account",
    icon: User,
  },
]

export function AppSidebar() {
  return (
    <Sidebar collapsible="none" className="h-screen border-r p-4 pt-4 shrink-0 max-w-[15rem]">
      <SidebarHeader>
        <h2 className="text-xl font-semibold">Goldilocks</h2>
      </SidebarHeader>
      <SidebarContent className="flex flex-col flex-1">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <a href={item.url}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <p className="text-xs text-muted-foreground">© 2025 Goldilocks AI</p>
      </SidebarFooter>
    </Sidebar>
  );
}
