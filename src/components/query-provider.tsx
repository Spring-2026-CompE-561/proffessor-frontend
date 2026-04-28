"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

interface QueryProviderProps {
	children: ReactNode;
}

/**
 * Creates a single QueryClient for this browser session so every page shares
 * the same cache, loading state, and refetch behavior.
 */
export function QueryProvider({ children }: Readonly<QueryProviderProps>) {
	/**
	 * useState lets us create the QueryClient exactly once per mounted provider
	 * instead of rebuilding the cache on every render.
	 */
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						retry: 1,
						refetchOnWindowFocus: false,
						staleTime: 30_000,
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools
				initialIsOpen={false}
				buttonPosition="bottom-right"
			/>
		</QueryClientProvider>
	);
}
