import { Home, User, Inbox } from "lucide-react"
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
    <Sidebar collapsible="none" className="p-4 pt-4">
      <SidebarHeader>
        <h2 className="text-lg font-semibold">Goldilocks</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <a href={item.url}>
                  <item.icon />
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
