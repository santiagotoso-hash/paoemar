import { redirect } from "next/navigation";
import { getCurrentUser, ROUTE_ROLES } from "@/lib/auth";

export default async function MesasLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getCurrentUser();
  if (!role || !ROUTE_ROLES["/mesas"].includes(role)) redirect("/sin-acceso");

  // Pensado para celular: coluna estreita com gutter de 16px.
  return <div className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-md px-4 py-5">{children}</div>;
}
