import {
	fetchApiJsonWithFallback,
	isMissingDashboardEndpointError,
	isRecord,
	postApiJsonWithFallback,
} from "@/lib/api";

export const TRANSACTION_METRICS_QUERY_KEY = ["transaction", "metrics"] as const;
export const TRANSACTIONS_QUERY_KEY = ["transaction", "list"] as const;
export const CATEGORY_METRICS_QUERY_KEY = ["category", "metrics"] as const;
export const CATEGORIES_QUERY_KEY = ["category", "list"] as const;
export const CREATE_TRANSACTION_MUTATION_KEY = ["transaction", "create"] as const;

export interface TransactionMetricsResponse {
	totalBalance: number | null;
	totalIncome: number | null;
	totalExpenses: number | null;
}

export interface DashboardTransaction {
	id: string;
	amount: number | null;
	description: string;
	transactionDate: string | null;
	transactionType: string;
	categoryName: string;
}

export interface DashboardCategory {
	id: string;
	name: string;
	type: string;
}

export interface CategoryMetric {
	name: string;
	total: number;
}

export interface CategoryMetricsResponse {
	incomeCategories: CategoryMetric[];
	expenseCategories: CategoryMetric[];
}

export interface CreateTransactionInput {
	categoryId: string;
	description: string;
	amount: number;
	transactionType: "income" | "expense";
}

/**
 * Converts optional text fields into a predictable `string | null` shape so
 * later normalizers do not need to repeat blank-string checks.
 */
function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/**
 * Accepts either numeric JSON values or numeric strings and normalizes them to
 * `number | null` for the rest of the dashboard data layer.
 */
function readNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}

/**
 * Finds the first array-like payload shape we know how to render. This lets
 * the UI tolerate small backend response-shape differences without breaking.
 */
function readArray(payload: unknown): unknown[] {
	if (Array.isArray(payload)) {
		return payload;
	}

	if (isRecord(payload)) {
		const nestedArrays = ["data", "items", "results", "transactions", "categories"];

		for (const key of nestedArrays) {
			const candidate = payload[key];
			if (Array.isArray(candidate)) {
				return candidate;
			}
		}
	}

	return [];
}

/**
 * Normalizes whichever transaction-metrics shape the backend returns into the
 * fixed fields used by the overview cards.
 */
function normalizeTransactionMetrics(
	payload: unknown,
): TransactionMetricsResponse {
	if (!isRecord(payload)) {
		return {
			totalBalance: null,
			totalIncome: null,
			totalExpenses: null,
		};
	}

	return {
		totalBalance:
			readNumber(payload.total_balance) ?? readNumber(payload.balance),
		totalIncome:
			readNumber(payload.total_income) ?? readNumber(payload.income),
		totalExpenses:
			readNumber(payload.total_expense) ??
			readNumber(payload.total_expenses) ??
			readNumber(payload.expense) ??
			readNumber(payload.expenses),
	};
}

/**
 * Converts one unknown transaction record into the consistent format the
 * transaction history card expects.
 */
function normalizeTransaction(payload: unknown): DashboardTransaction | null {
	if (!isRecord(payload)) {
		return null;
	}

	const idCandidate = payload.id ?? payload.transaction_id ?? payload.uuid;
	const description =
		readString(payload.description) ??
		readString(payload.memo) ??
		"Transaction";

	return {
		id: String(idCandidate ?? description),
		amount: readNumber(payload.amount),
		description,
		transactionDate:
			readString(payload.transaction_date) ??
			readString(payload.date) ??
			readString(payload.created_at),
		transactionType:
			readString(payload.transaction_type) ??
			readString(payload.type) ??
			"unknown",
		categoryName:
			readString(payload.category_name) ??
			readString(payload.category) ??
			"Uncategorized",
	};
}

/**
 * Converts one raw category record into the shape used by the dashboard count
 * and any future category-specific UI.
 */
function normalizeCategory(payload: unknown): DashboardCategory | null {
	if (!isRecord(payload)) {
		return null;
	}

	const idCandidate = payload.id ?? payload.category_id ?? payload.name;
	const name =
		readString(payload.category_name) ??
		readString(payload.name) ??
		"Unnamed category";

	return {
		id: String(idCandidate ?? name),
		name,
		type:
			readString(payload.category_type) ??
			readString(payload.type) ??
			"unknown",
	};
}

/**
 * Converts one category-total entry into the `name + total` shape used by the
 * category breakdown cards.
 */
function normalizeCategoryMetric(payload: unknown): CategoryMetric | null {
	if (!isRecord(payload)) {
		return null;
	}

	const name =
		readString(payload.name) ??
		readString(payload.category_name) ??
		"Uncategorized";
	const total = readNumber(payload.total) ?? readNumber(payload.amount);

	if (total === null) {
		return null;
	}

	return {
		name,
		total,
	};
}

/**
 * Normalizes one list of category totals, filtering out entries that are too
 * incomplete to render.
 */
function normalizeCategoryMetricList(payload: unknown): CategoryMetric[] {
	return readArray(payload)
		.map((entry) => normalizeCategoryMetric(entry))
		.filter((entry): entry is CategoryMetric => entry !== null);
}

/**
 * Converts category identifiers back into the most likely backend-friendly
 * shape. Numeric IDs become numbers again, while UUID-like values stay strings.
 */
function normalizeCategoryIdForRequest(categoryId: string): number | string {
	if (/^\d+$/.test(categoryId)) {
		return Number(categoryId);
	}

	return categoryId;
}

/**
 * Normalizes the full category-metrics response into separate income and
 * expense lists so the page can render two side-by-side panels.
 */
function normalizeCategoryMetrics(payload: unknown): CategoryMetricsResponse {
	if (!isRecord(payload)) {
		return {
			incomeCategories: [],
			expenseCategories: [],
		};
	}

	return {
		incomeCategories: normalizeCategoryMetricList(
			payload.income_categories ?? payload.incomeCategories ?? payload.income,
		),
		expenseCategories: normalizeCategoryMetricList(
			payload.expense_categories ?? payload.expenseCategories ?? payload.expense,
		),
	};
}

/**
 * Loads the aggregate money totals used by the overview cards. The fallback
 * helper lets this function survive small route-name differences.
 */
export async function fetchTransactionMetrics(
	accessToken: string,
): Promise<TransactionMetricsResponse> {
	const payload = await fetchApiJsonWithFallback<unknown>(
		["/api/v1/transaction/metrics", "/api/v1/transactions/metrics"],
		accessToken,
	);

	return normalizeTransactionMetrics(payload);
}

/**
 * Loads the transaction list and normalizes it for the recent-history panel
 * and the category fallback calculation.
 */
export async function fetchTransactions(
	accessToken: string,
): Promise<DashboardTransaction[]> {
	const payload = await fetchApiJsonWithFallback<unknown>(
		["/api/v1/transaction", "/api/v1/transactions"],
		accessToken,
	);

	return readArray(payload)
		.map((entry) => normalizeTransaction(entry))
			.filter((entry): entry is DashboardTransaction => entry !== null);
}

/**
 * Loads the category list used for counts and future dashboard expansion. If
 * the backend does not expose a category list route yet, the dashboard treats
 * that as "no categories available" instead of a fatal error.
 */
export async function fetchCategories(
	accessToken: string,
): Promise<DashboardCategory[]> {
	try {
		const payload = await fetchApiJsonWithFallback<unknown>(
			["/api/v1/category", "/api/v1/categories"],
			accessToken,
		);

		return readArray(payload)
			.map((entry) => normalizeCategory(entry))
			.filter((entry): entry is DashboardCategory => entry !== null);
	} catch (error) {
		if (isMissingDashboardEndpointError(error)) {
			return [];
		}

		throw error;
	}
}

/**
 * Loads grouped category totals. When that endpoint does not exist, the page
 * falls back to deriving categories from transactions instead.
 */
export async function fetchCategoryMetrics(
	accessToken: string,
): Promise<CategoryMetricsResponse> {
	try {
		const payload = await fetchApiJsonWithFallback<unknown>(
			["/api/v1/category/metrics", "/api/v1/categories/metrics"],
			accessToken,
		);

		return normalizeCategoryMetrics(payload);
	} catch (error) {
		if (isMissingDashboardEndpointError(error)) {
			return {
				incomeCategories: [],
				expenseCategories: [],
			};
		}

		throw error;
	}
}

/**
 * Creates one new transaction using an existing category. The mutation reuses
 * the same singular/plural route fallback idea as the queries, but it only
 * retries on route-shape errors so real validation problems stay visible.
 */
export async function createTransaction(
	accessToken: string,
	input: CreateTransactionInput,
): Promise<DashboardTransaction | null> {
	const payload = await postApiJsonWithFallback<unknown, Record<string, unknown>>(
		["/api/v1/transaction", "/api/v1/transactions"],
		accessToken,
		{
			amount: input.amount,
			category_id: normalizeCategoryIdForRequest(input.categoryId),
			description: input.description,
			type: input.transactionType,
		},
	);

	return normalizeTransaction(payload);
}
