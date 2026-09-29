import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SinAccesoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Você não tem acesso a esta seção</h1>
      <p className="text-muted-foreground">
        Seu usuário não tem o cargo necessário para ver esta tela. Se acha
        que é um erro, fale com um administrador.
      </p>
      <Button render={<Link href="/">Voltar ao início</Link>} />
    </div>
  );
}
