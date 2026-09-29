import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getCurrentUser, ROUTE_ROLES } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { HeaderNav } from "@/components/header-nav";

const NAV_ITEMS = [
  { href: "/admin/productos", label: "Admin", roles: ROUTE_ROLES["/admin"] },
  { href: "/pos", label: "Mostrador", roles: ROUTE_ROLES["/pos"] },
  { href: "/caja", label: "Caja", roles: ROUTE_ROLES["/caja"] },
  { href: "/mesas", label: "Mesas", roles: ROUTE_ROLES["/mesas"] },
  { href: "/cocina", label: "Cocina", roles: ROUTE_ROLES["/cocina"] },
];

export async function AppHeader() {
  const { userId, role } = await getCurrentUser();
  const items = role ? NAV_ITEMS.filter((i) => i.roles.includes(role)) : [];

  return (
    <header className="sticky top-0 z-40 border-b border-header-border bg-header text-header-foreground">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-heading text-lg font-semibold tracking-wide">
          Pão e Mar
        </Link>

        <HeaderNav items={items} />

        <div className="flex items-center gap-3">
          {userId ? (
            <UserButton />
          ) : (
            <Button size="sm" render={<Link href="/sign-in">Iniciar sesión</Link>} />
          )}
        </div>
      </div>
    </header>
  );
}
