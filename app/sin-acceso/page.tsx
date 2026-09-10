import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SinAccesoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">No tenés acceso a esta sección</h1>
      <p className="text-muted-foreground">
        Tu usuario no tiene el rol necesario para ver esta pantalla. Si creés
        que es un error, hablá con un administrador.
      </p>
      <Button render={<Link href="/">Volver al inicio</Link>} />
    </div>
  );
}
