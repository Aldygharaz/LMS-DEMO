/* eslint-disable react-refresh/only-export-components */
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../server/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 menit data cache dianggap segar
      gcTime: 30 * 60 * 1000, // Simpan di cache memori 30 menit
      refetchOnWindowFocus: false, // Hemat kuota: Tidak spam request saat ganti tab/aplikasi
      refetchOnReconnect: false, // Mencegah spam request saat fluktuasi sinyal seluler
      retry: 1, // Batasi retry jika koneksi lambat
    },
  },
});
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
