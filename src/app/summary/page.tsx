"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, FolderOpen, PieChart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

import { CategoryBreakdownCard } from "@/components/dashboard/category-breakdown-card";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { CategoryTotalsChart } from "@/components/summary/category-totals-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	useCategoriesQuery,
	useCategoryMetricsQuery,
	useTransactionMetricsQuery,
	useTransactionsQuery,
} from "@/hooks/use-dashboard-data";
import { useBalanceQuery } from "@/hooks/use-balance-query";
import { ACCESS_TOKEN_KEY, ApiUnauthorizedError } from "@/lib/api";
import type { BalanceResponse } from "@/lib/balance";
import type { CategoryMetricsResponse, DashboardTransaction } from "@/lib/dashboard";

interface SummaryMetric {
	title: string;
	value: string;
	description: string;
	icon: React.ReactNode;
}

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
 * Builds income/expense category totals from transactions so the summary page
 * can still show chart sections when the grouped metrics endpoint is absent.
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
		bucket.set(
			transaction.categoryName,
			(bucket.get(transaction.categoryName) ?? 0) + transaction.amount,
		);
	}

	const mapToList = (entries: Map<string, number>) =>
		Array.from(entries.entries())
			.map(([name, total]) => ({ name, total }))
			.sort((left, right) => right.total - left.total);

	return {
		incomeCategories: mapToList(incomeTotals),
		expenseCategories: mapToList(expenseTotals),
	};
}

function buildSummaryMetrics(
	balanceData: BalanceResponse | undefined,
	transactionMetrics: {
		totalBalance: number | null;
		totalIncome: number | null;
		totalExpenses: number | null;
	},
	categoryCount: number,
): SummaryMetric[] {
	const fallbackBalance = readNumberFromRecord(balanceData, ["total_balance", "balance"]);
	const fallbackIncome = readNumberFromRecord(balanceData, ["total_income", "income"]);
	const fallbackExpenses = readNumberFromRecord(balanceData, [
		"total_expense",
		"total_expenses",
		"expense",
		"expenses",
	]);

	return [
		{
			title: "Balance",
			value: formatCurrency(transactionMetrics.totalBalance ?? fallbackBalance),
			description: "The current total shown across the summary experience.",
			icon: <Wallet />,
		},
		{
			title: "Income",
			value: formatCurrency(transactionMetrics.totalIncome ?? fallbackIncome),
			description: "Money moving into the budget over the recorded period.",
			icon: <TrendingUp />,
		},
		{
			title: "Expenses",
			value: formatCurrency(transactionMetrics.totalExpenses ?? fallbackExpenses),
			description: "Money moving out across the available transaction data.",
			icon: <TrendingDown />,
		},
		{
			title: "Categories",
			value: String(categoryCount),
			description: "Known spending and income categories available to summarize.",
			icon: <FolderOpen />,
		},
	];
}

export default function SummaryPage() {
	const router = useRouter();
	const [accessToken, setAccessToken] = useState<string | null>(null);
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);

	useEffect(() => {
		const storedToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);

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

	useEffect(() => {
		if (!(balanceQuery.error instanceof ApiUnauthorizedError)) {
			return;
		}

		window.localStorage.removeItem(ACCESS_TOKEN_KEY);
		toast.error(balanceQuery.error.message);
		router.replace("/signin");
	}, [balanceQuery.error, router]);

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
							The summary page reads the saved token before it builds the chart
							view.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
			<Card className="overflow-hidden border-0 bg-gradient-to-r from-primary/15 via-background to-sky-500/10 shadow-sm ring-1 ring-border">
				<CardHeader className="gap-6 md:grid-cols-[1fr_auto]">
					<div className="space-y-3">
						<div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
							<PieChart className="size-4" />
							Summary view
						</div>
						<div className="space-y-2">
							<CardTitle className="text-3xl md:text-4xl">
								Budget summary and chart view
							</CardTitle>
							<CardDescription className="max-w-2xl text-base">
								This page turns the same dashboard data into a more visual
								summary, using category-focused chart views inspired by the
								BudgetBuddy-next overview.
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
							<BarChart3 />
							{isRefreshing ? "Refreshing..." : "Refresh summary"}
						</Button>
						<p className="text-sm text-muted-foreground">
							Built from the same backend data as the dashboard, but arranged
							for trend reading.
						</p>
					</div>
				</CardHeader>
			</Card>

			<section className="space-y-4">
				<div className="space-y-1">
					<h2 className="text-2xl font-semibold tracking-tight">Summary totals</h2>
					<p className="text-sm text-muted-foreground">
						The key numbers stay visible while the rest of the page shifts into
						chart-focused views.
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

			<section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
				<CategoryTotalsChart
					incomeCategories={resolvedCategoryMetrics.incomeCategories}
					expenseCategories={resolvedCategoryMetrics.expenseCategories}
					isLoading={categoryMetricsQuery.isPending || transactionsQuery.isPending}
					errorMessage={
						categoryMetricsQuery.error instanceof Error
							? categoryMetricsQuery.error.message
							: transactionsQuery.error instanceof Error
								? transactionsQuery.error.message
								: undefined
					}
				/>

				<Card>
					<CardHeader>
						<CardTitle>What this chart shows</CardTitle>
						<CardDescription>
							Use this card while presenting the page to explain how the chart
							is built from grouped category totals.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="rounded-2xl border p-4">
							<p className="font-medium">Income category bars</p>
							<p className="mt-1 text-muted-foreground">
								Green bars rank the strongest income categories from the
								metrics endpoint or the transaction-derived fallback.
							</p>
						</div>
						<div className="rounded-2xl border p-4">
							<p className="font-medium">Expense category bars</p>
							<p className="mt-1 text-muted-foreground">
								Red bars rank the strongest spending categories using the same
								grouped-category logic.
							</p>
						</div>
						<div className="rounded-2xl border p-4">
							<p className="font-medium">Fallback behavior</p>
							<p className="mt-1 text-muted-foreground">
								If the backend does not expose category metrics, the page
								derives category totals from the transaction list so the chart
								still works.
							</p>
						</div>
					</CardContent>
				</Card>
			</section>

			<section className="grid gap-6 lg:grid-cols-2">
				<CategoryBreakdownCard
					title="Income category chart"
					description="A chart-like category view using grouped totals or the transaction-derived fallback."
					items={resolvedCategoryMetrics.incomeCategories}
					isLoading={categoryMetricsQuery.isPending}
					errorMessage={
						categoryMetricsQuery.error instanceof Error
							? categoryMetricsQuery.error.message
							: undefined
					}
					emptyMessage="No income categories are available for the summary yet."
					toneClassName="bg-emerald-500"
				/>
				<CategoryBreakdownCard
					title="Expense category chart"
					description="Matches the visual feel of the reference app's category breakdown area."
					items={resolvedCategoryMetrics.expenseCategories}
					isLoading={categoryMetricsQuery.isPending}
					errorMessage={
						categoryMetricsQuery.error instanceof Error
							? categoryMetricsQuery.error.message
							: undefined
					}
					emptyMessage="No expense categories are available for the summary yet."
					toneClassName="bg-rose-500"
				/>
			</section>
		</div>
	);
}
