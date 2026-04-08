import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from '@apollo/client';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/graphql';

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
