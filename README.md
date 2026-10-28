# Pão e Mar — PDV para padarias e restaurantes
 
> Sistema de frente de loja: cadastro de produtos, controle de estoque, vendas e cupom na impressora térmica.
 
**🔗 Demo:** https://paoemar-ten.vercel.app/
**Status:** desenvolvido para um comércio de Praia do Forte (BA), entra em operação na inauguração, em dezembro de 2026 · código-fonte privado (sistema de cliente)
 
<!-- Coloque aqui 2 ou 3 prints: tela de venda, cadastro de produtos, estoque, cupom impresso -->
<!-- Arraste a imagem para o editor do GitHub e ele gera o link sozinho -->
 
## O problema
 
Um comércio novo precisava de um sistema completo de gestão, pronto para operar desde o dia da inauguração.
 
## A solução
 
- **Vendas no balcão:** registro rápido de cada venda.
- **Catálogo de produtos:** cadastro com preços e categorias.
- **Controle de estoque:** acompanhamento do estoque de cada produto.
- **Cupom na impressora térmica:** impressão direto do sistema.
## Stack
 
| Camada | Tecnologias |
|---|---|
| Front-end | Next.js · React · TypeScript · Tailwind CSS |
| Back-end | NestJS · TypeScript · API REST |
| Banco de dados | PostgreSQL |
| Deploy | Vercel |
 
## Arquitetura
 
```
Caixa (Next.js) ──► API (NestJS) ──► PostgreSQL
      │
      ▼
Impressora térmica
```
 
## Meu papel
 
Desenvolvimento full stack de ponta a ponta: levantamento de requisitos com o cliente, modelagem do banco, API, interface, integração com a impressora, deploy e suporte.
 
---
 
Desenvolvido por **Santiago Toso** · [LinkedIn](https://www.linkedin.com/in/santiago-javier-toso-cam%C3%B3n) · [GitHub](https://github.com/santiagotoso-hash)
 
