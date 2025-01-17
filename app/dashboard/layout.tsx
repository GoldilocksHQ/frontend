import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

