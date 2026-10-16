/**
 * KAN-248 — como a TELA sabe que o cliente está logado, sem ver o token.
 *
 * O token vive num cookie httpOnly (ver app/api/graphql/route.ts): JavaScript
 * não o alcança — é exatamente esse o ponto. Mas a tela precisa saber se há
 * sessão, para abrir o login ANTES do checkout em vez de deixar o cliente
 * montar o pedido inteiro e falhar no "Confirmar" (foi o KAN-257).
 *
 * Então o proxy grava, junto do cookie da sessão, um cookie LEGÍVEL que não
 * carrega segredo nenhum: só a informação "existe sessão". Os dois nascem e
 * morrem juntos — no login, no logout, e no primeiro erro de sessão vindo da
 * API. Um atacante que leia este cookie não ganha nada: ele não autentica
 * ninguém.
 */

const COOKIE_LOGADO = 'bcm_logado';

export function estaLogado(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split('; ')
    .some((c) => c.startsWith(`${COOKIE_LOGADO}=1`));
}

/** Encerra a sessão: o cookie httpOnly só o servidor consegue apagar. */
export async function sair(): Promise<void> {
  try {
    await fetch('/api/graphql', { method: 'DELETE', credentials: 'same-origin' });
  } catch {
    // Sem rede o cookie continua lá, mas a API recusa o token expirado e o
    // proxy limpa os dois cookies na primeira resposta de sessão inválida.
  }
  try {
    localStorage.removeItem('user');
  } catch {
    // modo privado / storage bloqueado
  }
}
