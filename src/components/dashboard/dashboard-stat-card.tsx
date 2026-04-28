import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStatCardProps {
	title: string;
	value: string;
	description: string;
	icon: ReactNode;
}

/**
 * Reusable overview card for the "Current balance / Income / Expenses /
 * Categories" summary row at the top of the dashboard.
 */
export function DashboardStatCard({
	title,
	value,
	description,
	icon,
}: Readonly<DashboardStatCardProps>) {
	return (
		<Card className="h-full">
			<CardHeader className="grid grid-cols-[1fr_auto] items-start gap-4">
				<div className="space-y-1">
					<CardTitle>{title}</CardTitle>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
				<div className="rounded-2xl bg-muted/50 p-3 text-primary">{icon}</div>
			</CardHeader>
			<CardContent>
				<p className="text-3xl font-semibold tracking-tight">{value}</p>
			</CardContent>
		</Card>
	);
}
