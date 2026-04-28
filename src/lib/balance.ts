import { fetchApiJson } from "@/lib/api";

export const BALANCE_QUERY_KEY = ["balance"] as const;

export type BalanceResponse = Record<string, unknown>;

/**
 * Narrows unknown JSON into the object shape this teaching page expects to
 * render in both a field summary and a raw JSON preview.
 */
function isBalanceResponse(value: unknown): value is BalanceResponse {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Loads the current user's balance payload from the backend using the same
 * hardcoded API host that the rest of the frontend already uses today.
 */
export async function fetchBalance(
	accessToken: string,
): Promise<BalanceResponse> {
	const payload = await fetchApiJson<unknown>(
		"/api/v1/transaction/balance",
		accessToken,
	);

	if (!isBalanceResponse(payload)) {
		throw new Error("Balance endpoint returned an unexpected payload shape.");
	}

	return payload;
}
