import { redirect } from "next/navigation";
import { getCurrentUser, ROUTE_ROLES } from "@/lib/auth";

export default async function EncomendasLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getCurrentUser();
  if (!role || !ROUTE_ROLES["/encomendas"].includes(role)) redirect("/sin-acceso");

  return <div className="mx-auto min-h-screen max-w-3xl p-6">{children}</div>;
}
