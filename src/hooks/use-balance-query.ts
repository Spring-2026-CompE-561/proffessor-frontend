"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiUnauthorizedError } from "@/lib/api";
import {
	BALANCE_QUERY_KEY,
	fetchBalance,
	type BalanceResponse,
} from "@/lib/balance";

/**
 * Wraps the balance endpoint in React Query so the page can focus on rendering
 * states instead of manually managing fetch lifecycle state.
 */
export function useBalanceQuery(accessToken: string | null) {
	return useQuery<BalanceResponse>({
		queryKey: [...BALANCE_QUERY_KEY, accessToken],
		queryFn: async () => {
			if (!accessToken) {
				throw new ApiUnauthorizedError(
					"Sign in before requesting your balance data.",
				);
			}

			return fetchBalance(accessToken);
		},
		enabled: Boolean(accessToken),
	});
}
