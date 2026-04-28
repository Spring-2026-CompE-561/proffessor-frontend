"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiUnauthorizedError } from "@/lib/api";
import { BALANCE_QUERY_KEY } from "@/lib/balance";
import {
	CATEGORIES_QUERY_KEY,
	CATEGORY_METRICS_QUERY_KEY,
	CREATE_TRANSACTION_MUTATION_KEY,
	TRANSACTIONS_QUERY_KEY,
	TRANSACTION_METRICS_QUERY_KEY,
	createTransaction,
	fetchCategories,
	fetchCategoryMetrics,
	fetchTransactions,
	fetchTransactionMetrics,
	type CategoryMetricsResponse,
	type CreateTransactionInput,
	type DashboardCategory,
	type DashboardTransaction,
	type TransactionMetricsResponse,
} from "@/lib/dashboard";

/**
 * Converts the optional browser token into a guaranteed string for query
 * functions. Throwing here lets React Query store the error in the relevant
 * section instead of crashing the component tree.
 */
function requireAccessToken(accessToken: string | null): string {
	if (!accessToken) {
		throw new ApiUnauthorizedError("Sign in before requesting dashboard data.");
	}

	return accessToken;
}

/**
 * React Query wrapper for the dashboard overview totals.
 */
export function useTransactionMetricsQuery(accessToken: string | null) {
	return useQuery<TransactionMetricsResponse>({
		queryKey: [...TRANSACTION_METRICS_QUERY_KEY, accessToken],
		queryFn: () => fetchTransactionMetrics(requireAccessToken(accessToken)),
		enabled: Boolean(accessToken),
	});
}

/**
 * React Query wrapper for the recent transaction list.
 */
export function useTransactionsQuery(accessToken: string | null) {
	return useQuery<DashboardTransaction[]>({
		queryKey: [...TRANSACTIONS_QUERY_KEY, accessToken],
		queryFn: () => fetchTransactions(requireAccessToken(accessToken)),
		enabled: Boolean(accessToken),
	});
}

/**
 * React Query wrapper for the category list used by the category count card.
 */
export function useCategoriesQuery(accessToken: string | null) {
	return useQuery<DashboardCategory[]>({
		queryKey: [...CATEGORIES_QUERY_KEY, accessToken],
		queryFn: () => fetchCategories(requireAccessToken(accessToken)),
		enabled: Boolean(accessToken),
	});
}

/**
 * React Query wrapper for grouped category totals. The page can fall back to
 * transaction-derived categories if this query returns an empty result.
 */
export function useCategoryMetricsQuery(accessToken: string | null) {
	return useQuery<CategoryMetricsResponse>({
		queryKey: [...CATEGORY_METRICS_QUERY_KEY, accessToken],
		queryFn: () => fetchCategoryMetrics(requireAccessToken(accessToken)),
		enabled: Boolean(accessToken),
	});
}

/**
 * React Query mutation wrapper for the add-transaction teaching form. The hook
 * owns the server-state concern (invalidating related queries) while the form
 * component stays focused on collecting input and showing feedback.
 */
export function useCreateTransactionMutation(accessToken: string | null) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: [...CREATE_TRANSACTION_MUTATION_KEY, accessToken],
		mutationFn: (input: CreateTransactionInput) =>
			createTransaction(requireAccessToken(accessToken), input),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: BALANCE_QUERY_KEY }),
				queryClient.invalidateQueries({
					queryKey: TRANSACTION_METRICS_QUERY_KEY,
				}),
				queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
				queryClient.invalidateQueries({ queryKey: CATEGORY_METRICS_QUERY_KEY }),
			]);
		},
	});
}
