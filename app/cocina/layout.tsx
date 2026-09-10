import { redirect } from "next/navigation";
import { getCurrentUser, ROUTE_ROLES } from "@/lib/auth";

export default async function CocinaLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getCurrentUser();
  if (!role || !ROUTE_ROLES["/cocina"].includes(role)) redirect("/sin-acceso");

  return <div className="min-h-screen">{children}</div>;
}
