import DashboardClientLayout from "@/components/layouts/DashboardLayout";


export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}