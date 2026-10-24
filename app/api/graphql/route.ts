import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * KAN-248 — O TOKEN DO CLIENTE SAI DO ALCANCE DO JAVASCRIPT
 *
 * Antes: o accessToken do login ia para o `localStorage` e o Apollo o lia em
 * cada request. Qualquer XSS no site (um script de terceiro comprometido, uma
 * extensao, um `dangerouslySetInnerHTML` futuro) lia `localStorage.token` e
 * saia com a sessao de 7 DIAS do cliente — podendo fazer pedidos no nome dele.
 *
 * Agora: o navegador fala com ESTE proxy (mesma origem), que guarda o token num
 * cookie httpOnly. JavaScript nenhum alcanca o cookie, e o token nem aparece na
 * resposta do login: este handler o ARRANCA do corpo antes de devolver.
 *
 * Por que proxy e nao "cookie no dominio da API": o cookie precisa ser httpOnly
 * E chegar na API em outro dominio (api.bcmtech.com.br), o que exige
 * SameSite=None + CORS com credenciais — mais superficie e mais coisa para
 * configurar errado no deploy. Aqui o cookie e de primeira parte, do proprio
 * site, e quem adiciona o `Authorization` e o servidor do Next.
 *
 * O QUE NAO MUDA: o SSR continua chamando a API direto (dados publicos, sem
 * token), e as queries publicas seguem funcionando sem cookie nenhum.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://api.bcmtech.com.br/graphql'
    : 'http://localhost:3000/graphql');

// Nome curto e sem pista do que carrega.
const COOKIE_SESSAO = 'bcm_sess';
// Companheiro LEGIVEL, sem segredo nenhum: so diz "tem sessao". A tela precisa
// saber se o cliente esta logado para nao levar o carrinho ate o fim e falhar
// no confirmar (KAN-257), e o cookie httpOnly, por definicao, ela nao le.
const COOKIE_LOGADO = 'bcm_logado';

// Casado com JWT_EXPIRATION=7d da API. Se um dia divergir, o cookie expira
// antes (cliente faz login de novo) ou depois (a API recusa e o handler limpa
// os dois cookies no primeiro erro de sessao) — nunca fica numa sessao fantasma.
const DIAS = 7;
const MAX_AGE = DIAS * 24 * 60 * 60;

type CorpoGraphQL = {
  data?: Record<string, any> | null;
  errors?: { message?: string; extensions?: { code?: string } }[];
};

/** As mutations que devolvem token. Qualquer uma delas abre sessao. */
const MUTATIONS_DE_ENTRADA = ['loginApp', 'registerApp'] as const;

function ehErroDeSessao(corpo: CorpoGraphQL): boolean {
  return (corpo.errors || []).some((e) => {
    const code = e.extensions?.code || '';
    const msg = String(e.message || '');
    return (
      code === 'UNAUTHENTICATED' ||
      /SESSION_EXPIRED/i.test(code) ||
      /SESSION_EXPIRED|Unauthorized|jwt expired|token inv[aá]lido/i.test(msg)
    );
  });
}

export async function POST(req: Request) {
  let corpoEnviado: unknown;
  try {
    corpoEnviado = await req.json();
  } catch {
    return NextResponse.json({ errors: [{ message: 'Corpo invalido' }] }, { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;

  let resposta: Response;
  try {
    resposta = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(corpoEnviado),
      // Nada de cache: isto e o canal autenticado do cliente.
      cache: 'no-store',
    });
  } catch (err: any) {
    console.error('[storefront/graphql] API inalcancavel:', err?.message || err);
    return NextResponse.json(
      { errors: [{ message: 'Servico indisponivel. Tente novamente.' }] },
      { status: 502 },
    );
  }

  const texto = await resposta.text();
  let corpo: CorpoGraphQL;
  try {
    corpo = JSON.parse(texto);
  } catch {
    // Resposta nao-JSON (HTML de erro de proxy, por exemplo): repassa como erro
    // de GraphQL para o Apollo nao estourar com "Unexpected token".
    console.error('[storefront/graphql] resposta nao-JSON da API:', texto.slice(0, 200));
    return NextResponse.json(
      { errors: [{ message: 'Resposta invalida do servico.' }] },
      { status: 502 },
    );
  }

  // ── Abriu sessao? Guarda o token no cookie e ARRANCA do corpo ──────────────
  let tokenNovo: string | null = null;
  for (const campo of MUTATIONS_DE_ENTRADA) {
    const t = corpo.data?.[campo]?.accessToken;
    if (typeof t === 'string' && t.length > 0) {
      tokenNovo = t;
      // O cliente nao precisa do token — o proxy e quem autentica daqui em
      // diante. Devolver string vazia mantem o contrato do schema
      // (`accessToken: String!`) sem entregar o segredo ao navegador.
      corpo.data![campo].accessToken = '';
    }
  }

  const res = NextResponse.json(corpo, { status: resposta.status });

  if (tokenNovo) {
    res.cookies.set(COOKIE_SESSAO, tokenNovo, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE,
    });
    res.cookies.set(COOKIE_LOGADO, '1', {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE,
    });
  } else if (token && ehErroDeSessao(corpo)) {
    // Sessao morreu no servidor: limpa os dois cookies no mesmo instante, para
    // a tela nao continuar se achando logada (era o bug do KAN-257, agora no
    // lado do cookie).
    res.cookies.delete(COOKIE_SESSAO);
    res.cookies.delete(COOKIE_LOGADO);
  }

  return res;
}

/** Sair: apaga a sessao. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_SESSAO);
  res.cookies.delete(COOKIE_LOGADO);
  return res;
}
