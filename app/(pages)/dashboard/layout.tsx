// import { Suspense } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
          {/* <Suspense fallback={<Skeleton />}>{children}</Suspense> */}
          {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
