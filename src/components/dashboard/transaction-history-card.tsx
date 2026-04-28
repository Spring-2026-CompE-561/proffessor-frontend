import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { DashboardTransaction } from "@/lib/dashboard";

interface TransactionHistoryCardProps {
	transactions: DashboardTransaction[];
	errorMessage?: string;
	isLoading?: boolean;
}

/**
 * Formats transaction amounts for the recent-history list.
 */
function formatCurrency(amount: number | null) {
	if (amount === null) {
		return "—";
	}

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount);
}

/**
 * Converts raw backend dates into a short browser-local date string that reads
 * well in the compact transaction history layout.
 */
function formatDate(value: string | null) {
	if (!value) {
		return "No date";
	}

	const parsedDate = new Date(value);
	if (Number.isNaN(parsedDate.getTime())) {
		return value;
	}

	return parsedDate.toLocaleDateString();
}

/**
 * Shows the latest transactions in a simple list inspired by the reference
 * dashboard's history section.
 */
export function TransactionHistoryCard({
	transactions,
	errorMessage,
	isLoading,
}: Readonly<TransactionHistoryCardProps>) {
	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle>Recent transactions</CardTitle>
				<p className="text-sm text-muted-foreground">
					A lightweight history section inspired by the reference dashboard.
				</p>
			</CardHeader>
			<CardContent className="space-y-3">
				{isLoading ? (
					<p className="text-sm text-muted-foreground">
						Loading transaction history...
					</p>
				) : errorMessage ? (
					<p className="text-sm text-destructive">{errorMessage}</p>
				) : transactions.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No transactions are available yet.
					</p>
				) : (
					transactions.slice(0, 6).map((transaction) => {
						const isIncome =
							transaction.transactionType.toLowerCase() === "income";

						return (
							<div
								key={transaction.id}
								className="flex items-center justify-between gap-4 rounded-2xl border p-4"
							>
								<div className="flex items-center gap-3">
									<div
										className={`rounded-2xl p-2 ${
											isIncome
												? "bg-emerald-500/10 text-emerald-500"
												: "bg-rose-500/10 text-rose-500"
										}`}
									>
										{isIncome ? <ArrowUpRight /> : <ArrowDownRight />}
									</div>
									<div>
										<p className="font-medium">{transaction.description}</p>
										<p className="text-sm text-muted-foreground">
											{transaction.categoryName} · {formatDate(transaction.transactionDate)}
										</p>
									</div>
								</div>
								<div className="text-right">
									<p className="font-medium">
										{formatCurrency(transaction.amount)}
									</p>
									<p className="text-xs uppercase tracking-wide text-muted-foreground">
										{transaction.transactionType}
									</p>
								</div>
							</div>
						);
					})
				)}
			</CardContent>
		</Card>
	);
}
