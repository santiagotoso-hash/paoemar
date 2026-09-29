import { cn } from "@/lib/utils";

export function AvatarAtendente({ nombre, className }: { nombre: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-lg font-semibold text-primary",
        className
      )}
    >
      {nombre.trim().charAt(0).toUpperCase()}
    </span>
  );
}
