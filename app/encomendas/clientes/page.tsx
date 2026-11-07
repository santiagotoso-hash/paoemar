import { prisma } from "@/lib/prisma";
import { ClientesManager } from "./clientes-manager";

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({ orderBy: { nombre: "asc" } });

  return (
    <ClientesManager
      clientes={clientes.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        endereco: c.endereco,
        telefone: c.telefone,
        email: c.email,
        cnpj: c.cnpj,
        notas: c.notas,
      }))}
    />
  );
}
