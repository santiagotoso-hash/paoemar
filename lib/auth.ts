import { currentUser } from "@clerk/nextjs/server";

export const ROLES = ["admin", "cajero", "cocina", "mostrador"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Prefijo de ruta -> roles permitidos. Lo usan tanto el middleware
 * (redirect antes de renderizar) como cualquier chequeo server-side.
 */
export const ROUTE_ROLES: Record<string, Role[]> = {
  "/admin": ["admin"],
  "/pos": ["admin", "cajero", "mostrador"],
  "/caja": ["admin", "cajero"],
  "/comandas": ["admin", "mostrador"],
  "/cocina": ["admin", "cocina"],
};

export async function getCurrentUser(): Promise<{ userId: string; role: Role | null }> {
  const user = await currentUser();
  if (!user) return { userId: "", role: null };
  const role = (user.publicMetadata as { role?: Role } | undefined)?.role ?? null;
  return { userId: user.id, role };
}

/** Para usar en server actions y route handlers: corta con un error/401 si el rol no matchea. */
export async function requireRole(allowed: Role[]) {
  const { userId, role } = await getCurrentUser();
  if (!userId || !role || !allowed.includes(role)) {
    throw new Error("No autorizado");
  }
  return { userId, role };
}
