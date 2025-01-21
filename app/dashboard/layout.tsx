import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Toaster } from "@/components/ui/toaster"

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
      <Toaster />
    </SidebarProvider>
  );
}

