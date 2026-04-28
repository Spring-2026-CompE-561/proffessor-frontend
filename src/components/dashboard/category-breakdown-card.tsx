import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { CategoryMetric } from "@/lib/dashboard";

interface CategoryBreakdownCardProps {
	title: string;
	description: string;
	items: CategoryMetric[];
	errorMessage?: string;
	isLoading?: boolean;
	emptyMessage: string;
	toneClassName: string;
}

/**
 * Keeps category totals visually consistent everywhere they appear in the
 * dashboard cards.
 */
function formatCurrency(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value);
}

/**
 * Renders one category panel, including loading, empty, error, and ready
 * states, plus the simple progress bar visualization for each category.
 */
export function CategoryBreakdownCard({
	title,
	description,
	items,
	errorMessage,
	isLoading,
	emptyMessage,
	toneClassName,
}: Readonly<CategoryBreakdownCardProps>) {
	const total = items.reduce((sum, item) => sum + item.total, 0);

	const content = (() => {
		if (isLoading) {
			return (
				<p className="text-sm text-muted-foreground">
					Loading category data...
				</p>
			);
		}

		if (errorMessage) {
			return <p className="text-sm text-destructive">{errorMessage}</p>;
		}

		if (items.length === 0) {
			return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
		}

		return items.map((item) => {
			const percentage = total > 0 ? (item.total / total) * 100 : 0;

			return (
				<div
					key={item.name}
					className="space-y-2"
				>
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="font-medium">{item.name}</p>
							<p className="text-xs text-muted-foreground">
								{percentage.toFixed(0)}% of this section
							</p>
						</div>
						<p className="text-sm font-medium">{formatCurrency(item.total)}</p>
					</div>
					<div className="h-2 rounded-full bg-muted">
						<div
							className={`h-2 rounded-full ${toneClassName}`}
							style={{ width: `${Math.max(8, percentage)}%` }}
						/>
					</div>
				</div>
			);
		});
	})();

	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<p className="text-sm text-muted-foreground">{description}</p>
			</CardHeader>
			<CardContent className="space-y-4">{content}</CardContent>
		</Card>
	);
}
