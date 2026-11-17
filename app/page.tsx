import Image from "next/image";
import { createServerApolloClient } from "@/lib/apollo";
import { GET_PUBLIC_STORES } from "@/lib/graphql";
import { ListaDeLojas, type StoreCardData } from "@/components/ListaDeLojas";
import { BotaoDaConta } from "@/components/BotaoDaConta";

export const dynamic = "force-dynamic";

/** null = não deu para falar com a API (diferente de "nenhuma loja"). */
async function fetchStores(): Promise<StoreCardData[] | null> {
  try {
    const client = createServerApolloClient();
    const { data } = await client.query({ query: GET_PUBLIC_STORES });
    return data.publicStores ?? [];
  } catch (e) {
    console.error('[storefront] erro ao listar lojas:', e);
    return null;
  }
}

// KAN-282 (item 14): o layout raiz aplica o template "%s | BCM Shopping", entao
// este title virava "🛒 BCM Shopping — Lojas | BCM Shopping" — a marca duas
// vezes no resultado de busca e na aba. `absolute` entrega o titulo como esta,
// sem o template. A home tambem ganha canonical: ela e a raiz, e sem isso
// qualquer variante com parametro (utm de campanha) concorre com ela.
export const metadata = {
  title: { absolute: "🛒 BCM Shopping — Lojas" },
  description: "Encontre as melhores lojas e faça seu pedido diretamente.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const resposta = await fetchStores();
  const falhou = resposta === null;
  const stores = resposta ?? [];
  const open = stores.filter((s) => s.isOpen);

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      {/* Header */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-color)] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Image src="/logo.png" alt="BCM Shopping" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-bold text-[var(--text-primary)]">
            BCM Shopping
          </span>
          {/* Conta sempre visível: navegar é livre, comprar pede login. */}
          <div className="ml-auto">
            <BotaoDaConta />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
          Lojas disponíveis
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {open.length} loja{open.length !== 1 ? "s" : ""} aberta
          {open.length !== 1 ? "s" : ""} agora
        </p>

        {falhou ? (
          // Antes a API fora do ar aparecia como "nenhuma loja".
          <div className="text-center py-20 text-[var(--text-secondary)]">
            <p>Não conseguimos carregar as lojas agora.</p>
            <a
              href="/"
              className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white font-semibold hover:opacity-90"
            >
              Tentar de novo
            </a>
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-20 text-[var(--text-secondary)]">
            Nenhuma loja disponível no momento.
          </div>
        ) : (
          <ListaDeLojas stores={stores} />
        )}
      </main>
    </div>
  );
}

