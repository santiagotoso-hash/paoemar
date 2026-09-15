import Link from "next/link";
import {
  Settings2Icon,
  ShoppingBagIcon,
  WalletIcon,
  ClipboardListIcon,
  ChefHatIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

const SECCIONES: { href: string; label: string; descripcion: string; icon: LucideIcon; roles: string[] }[] = [
  {
    href: "/admin/productos",
    label: "Admin",
    descripcion: "Catálogo, categorías, reportes y alertas de stock",
    icon: Settings2Icon,
    roles: ["admin"],
  },
  {
    href: "/pos",
    label: "Venta de mostrador",
    descripcion: "Armá el carrito y cobrá al instante",
    icon: ShoppingBagIcon,
    roles: ["admin", "cajero", "mostrador"],
  },
  {
    href: "/caja",
    label: "Caja",
    descripcion: "Apertura, cierre y movimientos de efectivo",
    icon: WalletIcon,
    roles: ["admin", "cajero"],
  },
  {
    href: "/comandas",
    label: "Comandas",
    descripcion: "Mesas abiertas y cuentas por cerrar",
    icon: ClipboardListIcon,
    roles: ["admin", "mostrador"],
  },
  {
    href: "/cocina",
    label: "Cocina",
    descripcion: "Pedidos en vivo, de recibido a entregado",
    icon: ChefHatIcon,
    roles: ["admin", "cocina"],
  },
];

export default async function Home() {
  const { userId, role } = await getCurrentUser();

  if (!userId) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-6 text-center">
        <h1 className="font-heading text-4xl font-semibold">Pão e Mar</h1>
        <p className="text-muted-foreground">Panadería boutique — punto de venta</p>
        <Button render={<Link href="/sign-in">Iniciar sesión</Link>} />
      </div>
    );
  }

  const disponibles = SECCIONES.filter((s) => role && s.roles.includes(role));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Bienvenido</h1>
        <p className="text-muted-foreground">Elegí una sección para empezar.</p>
      </div>

      {!role && (
        <p className="text-muted-foreground">
          Tu usuario todavía no tiene un rol asignado. Pedile a un administrador
          que te lo asigne desde el dashboard de Clerk.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {disponibles.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-colors hover:border-primary/60 hover:bg-accent">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <s.icon className="size-5" />
                  </div>
                  <CardTitle>{s.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{s.descripcion}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
