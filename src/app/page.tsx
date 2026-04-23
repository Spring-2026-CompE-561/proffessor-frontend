"use client";

import { Card } from "@/components/ui/card";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
	const router = useRouter();
	const [balanceData, setBalanceData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isAuthorized, setIsAuthorized] = useState(false);

	// Check auth immediately on mount
	useEffect(() => {
		const token = localStorage.getItem("access_token");
		if (!token) {
			router.push("/signin");
			return;
		}
		setIsAuthorized(true);
	}, [router]);

	const getDataFromBackend = useCallback(async () => {
		try {
			const token = localStorage.getItem("access_token");
			if (!token) {
				router.push("/signin");
				return;
			}

			const res = await fetch(
				"http://127.0.0.1:8000/api/v1/transaction/balance",
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);

			if (res.status === 401) {
				// Token is expired or invalid, clear it and redirect
				localStorage.removeItem("access_token");
				router.push("/signin");
				return;
			}

			if (!res.ok) {
				throw new Error(`Failed to fetch data: ${res.statusText}`);
			}

			const data = await res.json();
			setBalanceData(data);
			setError(null);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			console.error("Error fetching data:", err);
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}, [router]);

	useEffect(() => {
		if (isAuthorized) {
			getDataFromBackend();
		}
	}, [isAuthorized, getDataFromBackend]);

	if (!isAuthorized) {
		return <p>Redirecting to sign in...</p>;
	}

	const renderContent = () => {
		if (isLoading) return <p>Loading...</p>;
		if (error) return <p className="text-red-500">Error: {error}</p>;
		if (balanceData)
			return (
				<pre className="mt-2 w-[320px] overflow-x-auto rounded-md bg-code p-4 text-code-foreground">
					<code>{JSON.stringify(balanceData, null, 2)}</code>
				</pre>
			);
		return <p>No data available</p>;
	};

	return (
		<div className="flex w-full flex-col items-center justify-center gap-8 py-20">
			<Card className="w-full bg-card text-card-foreground">
				Balance Info
				{renderContent()}
			</Card>
		</div>
	);
}
