import { currentUser, clerkClient } from "@clerk/nextjs/server";

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

const AUTO_ADMIN_EMAILS = (process.env.ADMIN_AUTO_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Si el usuario todavía no tiene rol y su email está en ADMIN_AUTO_EMAILS,
 * le asigna "admin" en el momento (pensado para demos: el cliente se
 * registra y ya entra con acceso completo, sin que un admin tenga que
 * asignarle el rol a mano desde el dashboard de Clerk).
 */
export async function resolveRole(
  userId: string,
  email: string | undefined,
  currentRole: Role | null
): Promise<Role | null> {
  if (currentRole) return currentRole;
  if (!email || AUTO_ADMIN_EMAILS.length === 0) return null;
  if (!AUTO_ADMIN_EMAILS.includes(email.toLowerCase())) return null;

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, { publicMetadata: { role: "admin" } });
  return "admin";
}

export async function getCurrentUser(): Promise<{ userId: string; role: Role | null }> {
  const user = await currentUser();
  if (!user) return { userId: "", role: null };

  const rawRole = (user.publicMetadata as { role?: Role } | undefined)?.role ?? null;
  const email = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress;
  const role = await resolveRole(user.id, email, rawRole);

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
