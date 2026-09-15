import { clerkMiddleware, clerkClient, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ROUTE_ROLES, resolveRole, type Role } from "@/lib/auth";

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/pos(.*)",
  "/caja(.*)",
  "/comandas(.*)",
  "/cocina(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req)) return;

  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const rawRole = (user.publicMetadata as { role?: Role } | undefined)?.role ?? null;
  const email = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress;
  const role = await resolveRole(userId, email, rawRole);

  const prefix = Object.keys(ROUTE_ROLES).find((p) => req.nextUrl.pathname.startsWith(p));
  const allowedRoles = prefix ? ROUTE_ROLES[prefix] : [];

  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL("/sin-acceso", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
