import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, ROUTE_ROLES } from "@/lib/auth";
import { StockAlertsBanner } from "@/components/stock-alerts-banner";
import { getStockBajo } from "@/lib/realtime";

const TABS = [
  { href: "/admin/productos", label: "Produtos" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/estoque", label: "Estoque" },
  { href: "/admin/compras", label: "Compras" },
  { href: "/admin/atendentes", label: "Atendentes" },
  { href: "/admin/cancelamentos", label: "Cancelamentos" },
  { href: "/admin/reportes", label: "Relatórios" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getCurrentUser();
  if (!role || !ROUTE_ROLES["/admin"].includes(role)) redirect("/sin-acceso");

  const alertasIniciales = await getStockBajo();

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6">
      <h1 className="font-heading text-2xl font-semibold">Admin</h1>

      <StockAlertsBanner alertasIniciales={alertasIniciales} />

      <nav className="flex gap-2 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-t-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
