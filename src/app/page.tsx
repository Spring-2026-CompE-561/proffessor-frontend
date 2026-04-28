"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
	FolderOpen,
	LayoutDashboard,
	RefreshCw,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AddTransactionCard } from "@/components/dashboard/add-transaction-card";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { CategoryBreakdownCard } from "@/components/dashboard/category-breakdown-card";
import { TransactionHistoryCard } from "@/components/dashboard/transaction-history-card";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	useCategoriesQuery,
	useCategoryMetricsQuery,
	useTransactionMetricsQuery,
	useTransactionsQuery,
} from "@/hooks/use-dashboard-data";
import { useBalanceQuery } from "@/hooks/use-balance-query";
import { ACCESS_TOKEN_KEY, ApiUnauthorizedError } from "@/lib/api";
import type { BalanceResponse } from "@/lib/balance";
import type {
	CategoryMetricsResponse,
	DashboardTransaction,
} from "@/lib/dashboard";

interface SummaryMetric {
	title: string;
	value: string;
	description: string;
	icon: React.ReactNode;
}

/**
 * Looks for the first usable numeric field inside a flexible backend payload.
 * This helps the overview cards survive minor response-shape differences.
 */
function readNumberFromRecord(
	record: Record<string, unknown> | undefined,
	keys: string[],
): number | null {
	if (!record) {
		return null;
	}

	for (const key of keys) {
		const value = record[key];

		if (typeof value === "number" && Number.isFinite(value)) {
			return value;
		}

		if (typeof value === "string") {
			const parsed = Number(value);
			if (Number.isFinite(parsed)) {
				return parsed;
			}
		}
	}

	return null;
}

/**
 * Formats nullable numeric values for the summary cards.
 */
function formatCurrency(value: number | null): string {
	if (value === null) {
		return "Unavailable";
	}

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value);
}

/**
 * Converts the raw balance payload into labeled rows for the "API snapshot"
 * panel on the right side of the dashboard.
 */
function formatBalanceRows(balanceData: BalanceResponse | undefined) {
	if (!balanceData) {
		return [];
	}

	return Object.entries(balanceData).map(([label, value]) => ({
		label,
		value:
			typeof value === "string" || typeof value === "number"
				? String(value)
				: JSON.stringify(value),
	}));
}

/**
 * Rebuilds income and expense category totals from the transaction list. This
 * is the page's teaching-friendly fallback when the backend does not yet expose
 * grouped category metrics.
 */
function buildCategoryMetricsFromTransactions(
	transactions: DashboardTransaction[] | undefined,
): CategoryMetricsResponse {
	const incomeTotals = new Map<string, number>();
	const expenseTotals = new Map<string, number>();

	for (const transaction of transactions ?? []) {
		if (transaction.amount === null) {
			continue;
		}

		const bucket =
			transaction.transactionType.toLowerCase() === "income"
				? incomeTotals
				: expenseTotals;
		const currentTotal = bucket.get(transaction.categoryName) ?? 0;
		bucket.set(transaction.categoryName, currentTotal + transaction.amount);
	}

	const toMetricsList = (source: Map<string, number>) =>
		Array.from(source.entries())
			.map(([name, total]) => ({ name, total }))
			.sort((left, right) => right.total - left.total);

	return {
		incomeCategories: toMetricsList(incomeTotals),
		expenseCategories: toMetricsList(expenseTotals),
	};
}

/**
 * Pulls the dashboard cards from metrics endpoints first, then falls back to
 * the older balance payload when a newer endpoint is empty or unavailable.
 */
function buildSummaryMetrics(
	balanceData: BalanceResponse | undefined,
	transactionMetrics: {
		totalBalance: number | null;
		totalIncome: number | null;
		totalExpenses: number | null;
	},
	categoryCount: number,
): SummaryMetric[] {
	const fallbackBalance = readNumberFromRecord(balanceData, [
		"total_balance",
		"balance",
	]);
	const fallbackIncome = readNumberFromRecord(balanceData, [
		"total_income",
		"income",
	]);
	const fallbackExpenses = readNumberFromRecord(balanceData, [
		"total_expense",
		"total_expenses",
		"expense",
		"expenses",
	]);

	return [
		{
			title: "Current balance",
			value: formatCurrency(transactionMetrics.totalBalance ?? fallbackBalance),
			description: "Latest total from the balance or metrics endpoints.",
			icon: <Wallet />,
		},
		{
			title: "Income",
			value: formatCurrency(transactionMetrics.totalIncome ?? fallbackIncome),
			description: "Incoming funds for the dashboard overview.",
			icon: <TrendingUp />,
		},
		{
			title: "Expenses",
			value: formatCurrency(
				transactionMetrics.totalExpenses ?? fallbackExpenses,
			),
			description: "Outgoing funds for the current dashboard snapshot.",
			icon: <TrendingDown />,
		},
		{
			title: "Categories",
			value: String(categoryCount),
			description: "Tracked categories returned by the backend.",
			icon: <FolderOpen />,
		},
	];
}

/**
 * Home coordinates the entire dashboard lesson:
 * 1. read the browser token,
 * 2. start the React Query requests,
 * 3. redirect if the proven balance auth gate fails,
 * 4. combine API data with fallback-derived values,
 * 5. render the full dashboard layout, including a teaching mutation form.
 */
export default function Home() {
	const router = useRouter();
	const [accessToken, setAccessToken] = useState<string | null>(null);
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);

	/**
	 * The dashboard is still browser-authenticated, so token bootstrap happens
	 * after mount and redirects to sign-in when no token is available.
	 */
	useEffect(() => {
		const storedToken = globalThis.localStorage.getItem(ACCESS_TOKEN_KEY);

		queueMicrotask(() => {
			setAccessToken(storedToken);
			setIsCheckingAuth(false);

			if (!storedToken) {
				router.replace("/signin");
			}
		});
	}, [router]);

	const balanceQuery = useBalanceQuery(accessToken);
	const transactionMetricsQuery = useTransactionMetricsQuery(accessToken);
	const transactionsQuery = useTransactionsQuery(accessToken);
	const categoriesQuery = useCategoriesQuery(accessToken);
	const categoryMetricsQuery = useCategoryMetricsQuery(accessToken);

	/**
	 * The balance endpoint is the proven auth gate for this app. Other new
	 * dashboard sections may still be unavailable or misconfigured on the
	 * backend, so they should surface section-level errors instead of forcing a
	 * full sign-out.
	 */
	useEffect(() => {
		if (!(balanceQuery.error instanceof ApiUnauthorizedError)) {
			return;
		}

		globalThis.localStorage.removeItem(ACCESS_TOKEN_KEY);
		toast.error(balanceQuery.error.message);
		router.replace("/signin");
	}, [balanceQuery.error, router]);

	const balanceRows = useMemo(
		() => formatBalanceRows(balanceQuery.data),
		[balanceQuery.data],
	);
	/**
	 * The dashboard prefers real category metrics from the backend, but it can
	 * still teach grouped dashboard data by deriving category totals from the
	 * transaction list.
	 */
	const derivedCategoryMetrics = useMemo(
		() => buildCategoryMetricsFromTransactions(transactionsQuery.data),
		[transactionsQuery.data],
	);
	const resolvedCategoryMetrics = useMemo(() => {
		const apiMetrics = categoryMetricsQuery.data;

		if (
			apiMetrics &&
			(apiMetrics.incomeCategories.length > 0 ||
				apiMetrics.expenseCategories.length > 0)
		) {
			return apiMetrics;
		}

		return derivedCategoryMetrics;
	}, [categoryMetricsQuery.data, derivedCategoryMetrics]);
	/**
	 * The overview cards always choose the most specific totals first and fall
	 * back to the older balance endpoint when the newer metrics route is missing
	 * or incomplete.
	 */
	const summaryMetrics = useMemo(
		() =>
			buildSummaryMetrics(
				balanceQuery.data,
				transactionMetricsQuery.data ?? {
					totalBalance: null,
					totalIncome: null,
					totalExpenses: null,
				},
				categoriesQuery.data?.length ?? 0,
			),
		[balanceQuery.data, categoriesQuery.data, transactionMetricsQuery.data],
	);

	const isRefreshing =
		balanceQuery.isFetching ||
		transactionMetricsQuery.isFetching ||
		transactionsQuery.isFetching ||
		categoriesQuery.isFetching ||
		categoryMetricsQuery.isFetching;

	if (isCheckingAuth || !accessToken) {
		return (
			<div className="flex min-h-svh items-center justify-center px-6 py-16">
				<Card className="w-full max-w-xl">
					<CardHeader>
						<CardTitle>Checking your sign-in status</CardTitle>
						<CardDescription>
							The dashboard reads the saved token before it requests any
							protected backend data.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
			<Card className="overflow-hidden border-0 bg-linear-to-r from-primary/15 via-background to-amber-500/10 shadow-sm ring-1 ring-border">
				<CardHeader className="gap-6 md:grid-cols-[1fr_auto]">
					<div className="space-y-3">
						<div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
							<LayoutDashboard className="size-4" />
							Budget dashboard
						</div>
						<div className="space-y-2">
							<CardTitle className="text-3xl md:text-4xl">
								Hello again, Budget Buddy user.
							</CardTitle>
							<CardDescription className="max-w-2xl text-base">
								This simplified dashboard borrows the structure of the
								BudgetBuddy-next reference: a hero section, overview cards,
								category panels, and recent transaction history backed by React
								Query.
							</CardDescription>
						</div>
					</div>
					<div className="flex flex-col items-start gap-3 md:items-end">
						<Button
							type="button"
							onClick={() => {
								void balanceQuery.refetch();
								void transactionMetricsQuery.refetch();
								void transactionsQuery.refetch();
								void categoriesQuery.refetch();
								void categoryMetricsQuery.refetch();
							}}
							disabled={isRefreshing}
						>
							<RefreshCw className={isRefreshing ? "animate-spin" : ""} />
							{isRefreshing ? "Refreshing..." : "Refresh dashboard"}
						</Button>
						<p className="text-sm text-muted-foreground">
							Powered by the dashboard&apos;s transaction and category API
							endpoints.
						</p>
					</div>
				</CardHeader>
			</Card>

			<section className="space-y-4">
				<div className="space-y-1">
					<h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
					<p className="text-sm text-muted-foreground">
						A compact snapshot of the main numbers and collections the backend
						currently exposes for the dashboard.
					</p>
				</div>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{summaryMetrics.map((metric) => (
						<DashboardStatCard
							key={metric.title}
							title={metric.title}
							value={metric.value}
							description={metric.description}
							icon={metric.icon}
						/>
					))}
				</div>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
				<div className="grid gap-6">
					<div className="grid gap-6 lg:grid-cols-2">
						<CategoryBreakdownCard
							title="Income categories"
							description="Category totals from the metrics endpoint, with a transaction-based fallback when metrics are unavailable."
							items={resolvedCategoryMetrics.incomeCategories}
							isLoading={categoryMetricsQuery.isPending}
							errorMessage={
								categoryMetricsQuery.error instanceof Error
									? categoryMetricsQuery.error.message
									: undefined
							}
							emptyMessage="No income category metrics are available yet."
							toneClassName="bg-emerald-500"
						/>
						<CategoryBreakdownCard
							title="Expense categories"
							description="A simplified version of the reference dashboard breakdown cards."
							items={resolvedCategoryMetrics.expenseCategories}
							isLoading={categoryMetricsQuery.isPending}
							errorMessage={
								categoryMetricsQuery.error instanceof Error
									? categoryMetricsQuery.error.message
									: undefined
							}
							emptyMessage="No expense category metrics are available yet."
							toneClassName="bg-rose-500"
						/>
					</div>
					<TransactionHistoryCard
						transactions={transactionsQuery.data ?? []}
						isLoading={transactionsQuery.isPending}
						errorMessage={
							transactionsQuery.error instanceof Error
								? transactionsQuery.error.message
								: undefined
						}
					/>
				</div>

				<div className="grid gap-6">
					<AddTransactionCard
						accessToken={accessToken}
						categories={categoriesQuery.data ?? []}
						errorMessage={
							categoriesQuery.error instanceof Error
								? categoriesQuery.error.message
								: undefined
						}
						isLoadingCategories={categoriesQuery.isPending}
					/>

					<Card>
						<CardHeader>
							<CardTitle>API snapshot</CardTitle>
							<CardDescription>
								The balance endpoint remains the raw payload source for this
								page, even while the rest of the dashboard uses richer summary
								endpoints.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{balanceQuery.isPending ? (
								<p className="text-sm text-muted-foreground">
									Loading balance snapshot...
								</p>
							) : balanceQuery.error instanceof Error ? (
								<p className="text-sm text-destructive">
									{balanceQuery.error.message}
								</p>
							) : balanceRows.length > 0 ? (
								<div className="grid gap-3">
									{balanceRows.map((row) => (
										<div
											key={row.label}
											className="rounded-2xl border bg-muted/30 p-4"
										>
											<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
												{row.label}
											</p>
											<p className="mt-2 break-all text-sm">{row.value}</p>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									The balance endpoint returned no top-level fields.
								</p>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Connected dashboard sections</CardTitle>
							<CardDescription>
								This mirrors the reference dashboard more closely than the old
								balance-only teaching page.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div className="rounded-2xl border p-4">
								<p className="font-medium">Stats cards</p>
								<p className="mt-1 text-muted-foreground">
									Prefer the transaction metrics endpoint, then fall back to the
									balance payload when needed.
								</p>
							</div>
							<div className="rounded-2xl border p-4">
								<p className="font-medium">Category panels</p>
								<p className="mt-1 text-muted-foreground">
									Use the category metrics and category list endpoints for the
									breakdown and total count.
								</p>
							</div>
							<div className="rounded-2xl border p-4">
								<p className="font-medium">Transaction history</p>
								<p className="mt-1 text-muted-foreground">
									Uses the transaction list endpoint and shows the latest items
									in a simplified history list.
								</p>
							</div>
							<div className="rounded-2xl border p-4">
								<p className="font-medium">Mutation demo</p>
								<p className="mt-1 text-muted-foreground">
									The add-transaction form uses a React Query mutation, then
									invalidates the related dashboard queries so students can
									watch the data refresh in place.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
