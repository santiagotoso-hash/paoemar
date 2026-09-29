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
import { getCurrentUser, ROUTE_ROLES, type Role } from "@/lib/auth";

const SECCIONES: { href: string; label: string; descripcion: string; icon: LucideIcon; roles: Role[] }[] = [
  {
    href: "/admin/productos",
    label: "Admin",
    descripcion: "Catálogo, categorias, relatórios e alertas de estoque",
    icon: Settings2Icon,
    roles: ROUTE_ROLES["/admin"],
  },
  {
    href: "/pos",
    label: "Venda no balcão",
    descripcion: "Monte o carrinho e cobre na hora",
    icon: ShoppingBagIcon,
    roles: ROUTE_ROLES["/pos"],
  },
  {
    href: "/caja",
    label: "Caixa",
    descripcion: "Abertura, fechamento e movimentações de dinheiro",
    icon: WalletIcon,
    roles: ROUTE_ROLES["/caja"],
  },
  {
    href: "/mesas",
    label: "Mesas",
    descripcion: "Atendimento no salão: abrir mesa, lançar rodadas e fechar a conta",
    icon: ClipboardListIcon,
    roles: ROUTE_ROLES["/mesas"],
  },
  {
    href: "/cocina",
    label: "Cozinha",
    descripcion: "Pedidos ao vivo, de recebido a entregue",
    icon: ChefHatIcon,
    roles: ROUTE_ROLES["/cocina"],
  },
];

export default async function Home() {
  const { userId, role } = await getCurrentUser();

  if (!userId) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-6 text-center">
        <h1 className="font-heading text-4xl font-semibold">Pão e Mar</h1>
        <p className="text-muted-foreground">Padaria boutique — ponto de venda</p>
        <Button render={<Link href="/sign-in">Entrar</Link>} />
      </div>
    );
  }

  const disponibles = SECCIONES.filter((s) => role && s.roles.includes(role));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Bem-vindo</h1>
        <p className="text-muted-foreground">Escolha uma seção para começar.</p>
      </div>

      {disponibles.length === 0 && (
        <p className="text-muted-foreground">
          Seu usuário ainda não tem um cargo atribuído. Peça a um administrador
          para atribuí-lo pelo dashboard do Clerk.
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
