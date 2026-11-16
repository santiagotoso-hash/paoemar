import { z } from "zod";
import { FORMATO, ORIGENS, soDigitos } from "@/lib/fiscal";

/** Campo opcional: vazio vira null; preenchido precisa ter o formato exato (só dígitos). */
function campo(nome: string, formato: RegExp, mensagem: string) {
  return z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? soDigitos(v) : null))
    .refine((v) => v === null || formato.test(v), `${nome}: ${mensagem}`);
}

/** Os quatro dados fiscais, para usar dentro de um z.object (categoria ou produto). */
export const camposFiscais = {
  ncm: campo("NCM", FORMATO.ncm, "8 dígitos (ex.: 19059090)"),
  cfop: campo("CFOP", FORMATO.cfop, "4 dígitos (ex.: 5102)"),
  csosn: campo("CSOSN", FORMATO.csosn, "3 dígitos (ex.: 102)"),
  origem: z
    .number()
    .int()
    .nullish()
    .transform((v) => v ?? null)
    .refine((v) => v === null || ORIGENS.includes(v), "Origem inválida"),
};
