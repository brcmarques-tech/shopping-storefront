import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerApolloClient } from '@/lib/apollo';
import { GET_PUBLIC_STOREFRONT } from '@/lib/graphql';
import { StorefrontClient } from '@/components/StorefrontClient';

interface Props {
  params: Promise<{ storeId: string }>;
}

/**
 * KAN-282 (item 13): o `catch` engolia QUALQUER erro e devolvia null, e o
 * chamador transformava null em notFound() — ou seja, HTTP 404. Timeout da API,
 * 500, API fora do ar: tudo virava "esta loja nao existe". Dois estragos:
 *
 *  - o error.tsx escrito no KAN-257 nunca disparava, porque o erro nunca
 *    chegava a propagar;
 *  - 10 minutos de instabilidade durante um crawl do Google e TODAS as URLs de
 *    loja respondem 404. As paginas mais compartilhadas (o link que a loja
 *    divulga no Instagram e no WhatsApp) podem sair do indice.
 *
 * Um 500 nao desindexa; um 404 desindexa. Entao o vies aqui e o inverso do que
 * estava: so devolve "inexistente" quando da para AFIRMAR que a loja nao
 * existe. Qualquer outra falha propaga e vira 500 + error.tsx.
 */
type ResultadoLoja = { tipo: 'ok'; loja: any } | { tipo: 'inexistente' };

/** So e 404 o que der para reconhecer POSITIVAMENTE como "loja nao existe". */
function ehLojaInexistente(erro: any): boolean {
  // Falha de transporte (API fora do ar, timeout, DNS, 5xx sem corpo GraphQL)
  // nunca e 404 — nao sabemos nada sobre a loja.
  if (erro?.networkError) return false;

  const erros = erro?.graphQLErrors;
  if (!Array.isArray(erros) || erros.length === 0) return false;

  // O servidor levanta NotFoundException('Loja nao encontrada') em
  // stores.service.ts (getPublicStorefront). Conferimos pelo status quando ele
  // vem nas extensions e, como rede de seguranca, pela mensagem.
  return erros.some((e: any) => {
    const status =
      e?.extensions?.originalError?.statusCode ?? e?.extensions?.status;
    if (status === 404) return true;
    if (e?.extensions?.code === 'NOT_FOUND') return true;
    return /n[aã]o\s+encontrada/i.test(String(e?.message || ''));
  });
}

async function fetchStorefront(storeId: string): Promise<ResultadoLoja> {
  const client = createServerApolloClient();
  // Tenta primeiro como slug, depois como UUID
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      storeId,
    );
  const variables = isUuid ? { storeId } : { slug: storeId };

  try {
    const { data } = await client.query({
      query: GET_PUBLIC_STOREFRONT,
      variables,
    });
    const loja = data?.publicStorefront;
    // Query respondeu bem e a loja veio vazia: ausencia de verdade.
    if (!loja) return { tipo: 'inexistente' };
    return { tipo: 'ok', loja };
  } catch (erro) {
    if (ehLojaInexistente(erro)) return { tipo: 'inexistente' };
    // Infra: propaga. Vira 500 e renderiza o error.tsx, em vez de 404.
    throw erro;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeId } = await params;
  const resultado = await fetchStorefront(storeId);
  // O layout raiz (KAN-257) já aplica o template "%s | BCM Shopping". Repetir
  // "| BCM Shopping" aqui gerava título duplicado ("Loja X | BCM Shopping |
  // BCM Shopping") em todas as páginas de loja — as URLs mais compartilhadas.
  if (resultado.tipo === 'inexistente') return { title: 'Loja não encontrada' };

  const store = resultado.loja;
  // KAN-282 (item 14): a mesma loja responde em /loja/<uuid> (links do app) e em
  // /loja/<slug> (links da home), e sem canonical as duas URLs disputam a mesma
  // autoridade de busca. O slug e a forma canonica; o UUID aponta para ele.
  // O `metadataBase` do layout raiz resolve o caminho relativo.
  const urlCanonica = `/loja/${store.slug || store.id}`;
  return {
    title: store.name,
    description: store.description || `Compre em ${store.name} direto pelo site`,
    alternates: {
      canonical: urlCanonica,
    },
    openGraph: {
      title: store.name,
      description: store.description,
      url: urlCanonica,
      images: store.bannerUrl
        ? [store.bannerUrl]
        : store.logoUrl
          ? [store.logoUrl]
          : [],
      type: 'website',
    },
  };
}

export default async function LojaPage({ params }: Props) {
  const { storeId } = await params;
  const resultado = await fetchStorefront(storeId);
  if (resultado.tipo === 'inexistente') notFound();
  return <StorefrontClient initialData={resultado.loja} />;
}
