import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { CategoryMetric } from "@/lib/dashboard";

interface CategoryTotalsChartProps {
	incomeCategories: CategoryMetric[];
	expenseCategories: CategoryMetric[];
	errorMessage?: string;
	isLoading?: boolean;
}

interface RankedCategoryMetric extends CategoryMetric {
	type: "income" | "expense";
}

function formatCurrency(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(value);
}

function buildRankedItems(
	incomeCategories: CategoryMetric[],
	expenseCategories: CategoryMetric[],
): RankedCategoryMetric[] {
	return [
		...incomeCategories.map((item) => ({ ...item, type: "income" as const })),
		...expenseCategories.map((item) => ({ ...item, type: "expense" as const })),
	]
		.sort((left, right) => right.total - left.total)
		.slice(0, 8);
}

/**
 * Shows the summary page's main chart as one combined category graph. Income
 * and expense categories are merged into a single ranked chart and color-coded
 * so the page stays compact and avoids horizontal overflow.
 */
export function CategoryTotalsChart({
	incomeCategories,
	expenseCategories,
	errorMessage,
	isLoading,
}: Readonly<CategoryTotalsChartProps>) {
	const rankedItems = buildRankedItems(incomeCategories, expenseCategories);
	const maxValue = Math.max(1, ...rankedItems.map((item) => item.total));

	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle>Category totals chart</CardTitle>
				<p className="text-sm text-muted-foreground">
					A combined graph of the strongest income and expense categories in
					the current dataset.
				</p>
			</CardHeader>
			<CardContent className="space-y-5">
				{isLoading ? (
					<p className="text-sm text-muted-foreground">
						Loading category chart data...
					</p>
				) : errorMessage ? (
					<p className="text-sm text-destructive">{errorMessage}</p>
				) : rankedItems.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No category totals are available for the chart yet.
					</p>
				) : (
					<div className="space-y-5">
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
							{rankedItems.map((item) => (
								<div
									key={`${item.type}-${item.name}`}
									className="rounded-2xl border bg-muted/20 p-4"
								>
									<div className="mb-4 flex items-center justify-between gap-3">
										<span
											className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
												item.type === "income"
													? "bg-emerald-500/10 text-emerald-600"
													: "bg-rose-500/10 text-rose-600"
											}`}
										>
											{item.type}
										</span>
										<span className="text-xs text-muted-foreground">
											{formatCurrency(item.total)}
										</span>
									</div>
									<div className="flex h-44 items-end justify-center">
										<div
											className={`w-16 rounded-t-2xl ${
												item.type === "income"
													? "bg-emerald-500"
													: "bg-rose-500"
											}`}
											style={{
												height: `${Math.max(
													16,
													(item.total / maxValue) * 100,
												)}%`,
											}}
										/>
									</div>
									<p className="mt-4 line-clamp-2 text-center text-sm font-medium">
										{item.name}
									</p>
								</div>
							))}
						</div>
						<div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
							<div className="flex items-center gap-2">
								<span className="size-3 rounded-full bg-emerald-500" />
								Income category
							</div>
							<div className="flex items-center gap-2">
								<span className="size-3 rounded-full bg-rose-500" />
								Expense category
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
