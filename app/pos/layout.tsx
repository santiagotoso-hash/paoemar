import { redirect } from "next/navigation";
import { getCurrentUser, ROUTE_ROLES } from "@/lib/auth";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getCurrentUser();
  if (!role || !ROUTE_ROLES["/pos"].includes(role)) redirect("/sin-acceso");

  return <div className="mx-auto min-h-screen max-w-6xl p-6">{children}</div>;
}
