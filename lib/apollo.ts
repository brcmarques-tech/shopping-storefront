import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from '@apollo/client';

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

// Client-side: singleton com auth do cliente logado
let clientInstance: ApolloClient<object> | null = null;

export function getApolloClient() {
  if (typeof window === 'undefined') return createServerApolloClient();
  if (clientInstance) return clientInstance;

  const authLink = new ApolloLink((operation, forward) => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    operation.setContext({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return forward(operation);
  });

  clientInstance = new ApolloClient({
    link: authLink.concat(new HttpLink({ uri: API_URL })),
    cache: new InMemoryCache(),
  });

  return clientInstance;
}
