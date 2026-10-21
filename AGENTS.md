<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# shopping-storefront — Regras de Projeto

Loja publica da web (quem compra pelo navegador, sem instalar o app). Porta local 3003
(`next dev` puro cai na 3000 e colide com a API — o `bcm.ps1` forca a porta).

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind + Apollo Client
- Next 16 tem quebras em relacao ao que voce "sabe" — ver o bloco acima

## Sessao do cliente (KAN-248)
- O token **nunca** vai para `localStorage`. O navegador fala com o proxy de mesma
  origem `app/api/graphql/route.ts`, que guarda o token num cookie **httpOnly** e o
  arranca do corpo da resposta de login. Quem adiciona o `Authorization` e o servidor
  do Next.
- `lib/sessao.ts` = estado de sessao no cliente; `lib/apollo.ts` tem dois clientes:
  um para o servidor (fala direto com `NEXT_PUBLIC_API_URL`) e um para o navegador
  (fala com `/api/graphql`). Nao trocar um pelo outro.
- Sessao unica: o login pode voltar `ACTIVE_SESSION`. Isso e **pergunta**, nao erro —
  mostrar o aviso com a opcao de entrar aqui mesmo (`forceLogin: true`), nunca jogar o
  codigo cru na tela.

## Imagens
- Logo e foto de produto vem de dominio de terceiro (Cloudinary, Unsplash...). Dominio
  fora do `remotePatterns` do `next.config` faz o `next/image` devolver **500 na
  pagina inteira**. Usar `propsDeImagemRemota()` de `lib/imagemRemota.ts`, que cai
  para `unoptimized` — nao abrir o otimizador para `**`.

## Pagamento
- Checkout em `components/CheckoutFlow.tsx`: PIX e cartao. O modelo e custodia — o
  dinheiro vai para a plataforma e so e repassado na confirmacao da entrega.

## Comandos
- `yarn dev --port 3003` — local
- `./node_modules/.bin/tsc --noEmit` — type-check (**nao** `npx tsc`: instala um
  pacote falso `tsc@2.0.4` e nao verifica nada)
