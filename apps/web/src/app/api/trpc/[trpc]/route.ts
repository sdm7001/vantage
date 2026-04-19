import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/root';
import { createContext } from '@/server/trpc';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError({ error }) {
      if (error.code === 'INTERNAL_SERVER_ERROR') {
        console.error('tRPC error:', error);
      }
    },
  });

export { handler as GET, handler as POST };
