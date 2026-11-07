/** "12345678000190" -> "12.345.678/0001-90" (14 dígitos; devolve o texto como veio se não bater). */
export function formatCnpj(valor: string) {
  const d = valor.replace(/\D/g, "");
  if (d.length !== 14) return valor;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
