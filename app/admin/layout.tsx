import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { StockAlertsBanner } from "@/components/stock-alerts-banner";
import { getStockBajo } from "@/lib/realtime";

const TABS = [
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/reportes", label: "Reportes" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getCurrentUser();
  if (role !== "admin") redirect("/sin-acceso");

  const alertasIniciales = await getStockBajo();

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Volver al inicio
        </Link>
      </div>

      <StockAlertsBanner alertasIniciales={alertasIniciales} />

      <nav className="flex gap-2 border-b">
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
