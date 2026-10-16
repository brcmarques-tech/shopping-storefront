import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

// KAN-258: o fallback silencioso para localhost era um risco real — se a env
// nao fosse injetada no deploy, o SSR chamaria `localhost:3000` em producao e a
// home apareceria vazia (o try/catch devolve []), sem nenhum sinal de que a
// causa foi configuracao. Em producao agora falha ruidosamente no log.
const API_URL = (() => {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[storefront] NEXT_PUBLIC_API_URL nao definida em producao — usando o dominio publico como fallback. Configure a variavel no deploy.',
    );
    return 'https://api.bcmtech.com.br/graphql';
  }
  return 'http://localhost:3000/graphql';
})();

// Server-side: nova instância por request (sem state compartilhado entre requests)
export function createServerApolloClient() {
  return new ApolloClient({
    ssrMode: true,
    link: new HttpLink({ uri: API_URL, fetch }),
    cache: new InMemoryCache(),
  });
}

// Client-side: singleton que fala com o PROXY do proprio site
let clientInstance: ApolloClient<object> | null = null;

/**
 * KAN-248: o navegador NAO manda mais `Authorization`, porque nao tem mais o
 * token. Ele fala com /api/graphql (mesma origem), e e o servidor do Next que
 * le o cookie httpOnly da sessao e autentica na API.
 *
 * Antes o accessToken do cliente — 7 dias de validade — ficava no
 * localStorage, legivel por QUALQUER script que rodasse na pagina.
 *
 * `credentials: 'same-origin'` e o que faz o cookie viajar no fetch do Apollo.
 * Sem isso o proxy recebe a chamada sem sessao e toda operacao autenticada
 * (criar pedido, ver pedidos) volta como nao autorizada.
 */
export function getApolloClient() {
  if (typeof window === 'undefined') return createServerApolloClient();
  if (clientInstance) return clientInstance;

  clientInstance = new ApolloClient({
    link: new HttpLink({ uri: '/api/graphql', credentials: 'same-origin' }),
    cache: new InMemoryCache(),
  });

  return clientInstance;
}
