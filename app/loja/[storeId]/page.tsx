import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerApolloClient } from '@/lib/apollo';
import { GET_PUBLIC_STOREFRONT } from '@/lib/graphql';
import { StorefrontClient } from '@/components/StorefrontClient';

interface Props {
  params: Promise<{ storeId: string }>;
}

async function fetchStorefront(storeId: string) {
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
    return data?.publicStorefront ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeId } = await params;
  const store = await fetchStorefront(storeId);
  // O layout raiz (KAN-257) já aplica o template "%s | BCM Shopping". Repetir
  // "| BCM Shopping" aqui gerava título duplicado ("Loja X | BCM Shopping |
  // BCM Shopping") em todas as páginas de loja — as URLs mais compartilhadas.
  if (!store) return { title: 'Loja não encontrada' };
  return {
    title: store.name,
    description: store.description || `Compre em ${store.name} direto pelo site`,
    openGraph: {
      title: store.name,
      description: store.description,
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
  const store = await fetchStorefront(storeId);
  if (!store) notFound();
  return <StorefrontClient initialData={store} />;
}
