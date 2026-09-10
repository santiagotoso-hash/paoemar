import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

const SECCIONES: { href: string; label: string; roles: string[] }[] = [
  { href: "/admin/productos", label: "Admin", roles: ["admin"] },
  { href: "/pos", label: "Venta de mostrador", roles: ["admin", "cajero", "mostrador"] },
  { href: "/caja", label: "Caja", roles: ["admin", "cajero"] },
  { href: "/comandas", label: "Comandas", roles: ["admin", "mostrador"] },
  { href: "/cocina", label: "Cocina", roles: ["admin", "cocina"] },
];

export default async function Home() {
  const { userId, role } = await getCurrentUser();

  if (!userId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-3xl font-semibold">Pao e Mar — PDV</h1>
        <p className="text-muted-foreground">Panadería boutique — punto de venta</p>
        <Button render={<Link href="/sign-in">Iniciar sesión</Link>} />
      </div>
    );
  }

  const disponibles = SECCIONES.filter((s) => role && s.roles.includes(role));

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pao e Mar — PDV</h1>
        <UserButton />
      </div>

      {!role && (
        <p className="text-muted-foreground">
          Tu usuario todavía no tiene un rol asignado. Pedile a un administrador
          que te lo asigne desde el dashboard de Clerk.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {disponibles.map((s) => (
          <Card key={s.href}>
            <CardHeader>
              <CardTitle>{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" render={<Link href={s.href}>Entrar</Link>} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
