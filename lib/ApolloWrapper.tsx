'use client';

import { ApolloProvider } from '@apollo/client';
import { getApolloClient } from './apollo';

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={getApolloClient()}>{children}</ApolloProvider>
  );
}
