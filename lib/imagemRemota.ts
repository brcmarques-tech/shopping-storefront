/**
 * Uma imagem de loja NÃO pode derrubar a página.
 *
 * O `next/image` só aceita hosts declarados em `images.remotePatterns`
 * (next.config.ts: Cloudinary e *.bcmtech.com.br). Com qualquer outro host ele
 * LANÇA no render — "Invalid src prop" — e a página inteira responde 500.
 *
 * Medido em 16/10/2026: a home do site caiu com 500 porque uma loja tinha
 * `logoUrl` apontando para images.unsplash.com. Não é caso de laboratório: o
 * painel do vendedor aceita URL de imagem digitada, então basta um lojista
 * colar um link do Instagram, do Imgur ou do próprio site para tirar do ar a
 * vitrine de TODAS as lojas — a home lista todas.
 *
 * Por que não liberar `hostname: '**'`: isso transformaria o otimizador do Next
 * num proxy aberto de imagens (qualquer um poderia fazer nosso servidor baixar
 * e servir arquivo de qualquer lugar, gastando banda e CPU por conta da gente).
 *
 * Então: host conhecido continua OTIMIZADO; host desconhecido é servido como
 * está (`unoptimized`), sem passar pelo otimizador e sem derrubar nada. A loja
 * fica com uma imagem mais pesada — e visível — em vez de uma página de erro.
 */

/** Hosts que o next.config.ts declara como otimizáveis. */
function otimizavel(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url, 'http://local');
    if (protocol !== 'https:') return false;
    return hostname === 'res.cloudinary.com' || hostname.endsWith('.bcmtech.com.br');
  } catch {
    return false;
  }
}

/**
 * Props de `next/image` para uma URL que veio do banco.
 * Caminho relativo (asset do próprio site, como /logo.png) é sempre otimizável.
 */
export function propsDeImagemRemota(url: string): { unoptimized?: boolean } {
  if (url.startsWith('/')) return {};
  return otimizavel(url) ? {} : { unoptimized: true };
}
