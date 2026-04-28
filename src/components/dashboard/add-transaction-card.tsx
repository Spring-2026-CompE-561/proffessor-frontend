"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import { useCreateTransactionMutation } from "@/hooks/use-dashboard-data";
import type { DashboardCategory } from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface AddTransactionCardProps {
	accessToken: string | null;
	categories: DashboardCategory[];
	errorMessage?: string;
	isLoadingCategories?: boolean;
}

const transactionFormSchema = z.object({
	categoryId: z.string().min(1, "Choose a category before saving."),
	description: z
		.string()
		.trim()
		.min(1, "Add a short description for the transaction.")
		.max(120, "Keep the description under 120 characters."),
	amount: z
		.string()
		.trim()
		.min(1, "Enter an amount for the transaction.")
		.refine((value) => Number.isFinite(Number(value)), {
			message: "Enter a valid number for the amount.",
		})
		.refine((value) => Number(value) > 0, {
			message: "Enter a positive amount for the transaction.",
		})
		.transform(Number),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;
type TransactionFormInput = z.input<typeof transactionFormSchema>;

interface SelectableCategory {
	id: string;
	name: string;
	transactionType: "income" | "expense";
}

/**
 * Keeps only categories whose type can safely drive the mutation payload.
 */
function buildSelectableCategories(
	categories: DashboardCategory[],
): SelectableCategory[] {
	return categories.flatMap((category) => {
		const normalizedType = category.type.toLowerCase();

		if (normalizedType !== "income" && normalizedType !== "expense") {
			return [];
		}

		return [
			{
				id: category.id,
				name: category.name,
				transactionType: normalizedType,
			},
		];
	});
}

/**
 * Gives the status callout a classroom-friendly label that matches React
 * Query's internal mutation state names.
 */
function formatMutationStatus(
	status: "idle" | "pending" | "error" | "success",
) {
	switch (status) {
		case "pending":
			return "Pending: the POST request is currently in flight.";
		case "success":
			return "Success: React Query invalidated the related dashboard queries.";
		case "error":
			return "Error: the mutation failed and the cache stayed unchanged.";
		default:
			return "Idle: no transaction has been submitted yet.";
	}
}

/**
 * Matches the category badge color to the transaction type students will see in
 * the history list after the mutation succeeds.
 */
function getTypeBadgeClassName(transactionType: "income" | "expense") {
	return transactionType === "income"
		? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
		: "bg-rose-500/10 text-rose-600 dark:text-rose-400";
}

/**
 * Renders a small teaching form that demonstrates a React Query mutation using
 * the existing category list. The form does not fetch anything on its own; it
 * only prepares inputs and hands the mutation work to the shared hook layer.
 */
export function AddTransactionCard({
	accessToken,
	categories,
	errorMessage,
	isLoadingCategories,
}: Readonly<AddTransactionCardProps>) {
	const selectableCategories = useMemo(
		() => buildSelectableCategories(categories),
		[categories],
	);
	const createTransactionMutation = useCreateTransactionMutation(accessToken);
	const form = useForm<TransactionFormInput, undefined, TransactionFormValues>({
		resolver: zodResolver(transactionFormSchema),
		defaultValues: {
			categoryId: "",
			description: "",
			amount: "",
		},
	});
	const selectedCategoryId = useWatch({
		control: form.control,
		name: "categoryId",
	});
	const selectedCategory = selectableCategories.find(
		(category) => category.id === selectedCategoryId,
	);

	/**
	 * When categories arrive asynchronously, the form should automatically pick a
	 * sensible default so students can focus on the mutation behavior instead of
	 * fixing an empty select input first.
	 */
	useEffect(() => {
		if (selectableCategories.length === 0) {
			return;
		}

		const currentSelection = form.getValues("categoryId");
		const hasValidSelection = selectableCategories.some(
			(category) => category.id === currentSelection,
		);

		if (!hasValidSelection) {
			form.setValue("categoryId", selectableCategories[0].id, {
				shouldDirty: false,
				shouldValidate: true,
			});
		}
	}, [form, selectableCategories]);

	async function onSubmit(values: TransactionFormValues) {
		if (!selectedCategory) {
			toast.error("Choose an existing income or expense category first.");
			return;
		}

		try {
			await createTransactionMutation.mutateAsync({
				amount: values.amount,
				categoryId: values.categoryId,
				description: values.description,
				transactionType: selectedCategory.transactionType,
			});
			toast.success("Transaction saved and dashboard queries refreshed.");
			form.reset({
				categoryId: selectedCategory.id,
				description: "",
				amount: "",
			});
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "The transaction could not be saved.",
			);
		}
	}

	const transactionFormContent = (() => {
		if (isLoadingCategories) {
			return (
				<p className="text-sm text-muted-foreground">
					Loading categories for the mutation form...
				</p>
			);
		}

		if (errorMessage) {
			return <p className="text-sm text-destructive">{errorMessage}</p>;
		}

		if (selectableCategories.length === 0) {
			return (
				<p className="text-sm text-muted-foreground">
					The form is waiting for at least one existing income or expense
					category from the backend.
				</p>
			);
		}

		return (
			<form
				id="add-transaction-form"
				onSubmit={form.handleSubmit(onSubmit)}
				className="space-y-5"
			>
				<FieldGroup>
					<Controller
						name="categoryId"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="transaction-category">
									Existing category
								</FieldLabel>
								<select
									{...field}
									id="transaction-category"
									aria-invalid={fieldState.invalid}
									className="h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20"
								>
									{selectableCategories.map((category) => (
										<option
											key={category.id}
											value={category.id}
										>
											{category.name} ({category.transactionType})
										</option>
									))}
								</select>
								<FieldDescription>
									The form derives the transaction type directly from the
									selected category.
								</FieldDescription>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>
					<Controller
						name="description"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="transaction-description">
									Description
								</FieldLabel>
								<Input
									{...field}
									id="transaction-description"
									aria-invalid={fieldState.invalid}
									placeholder="Coffee with the project team"
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>
					<Controller
						name="amount"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="transaction-amount">Amount</FieldLabel>
								<Input
									id="transaction-amount"
									aria-invalid={fieldState.invalid}
									type="number"
									step="0.01"
									min="0"
									placeholder="0.00"
									value={field.value}
									onBlur={field.onBlur}
									onChange={(event) => field.onChange(event.target.value)}
									name={field.name}
									ref={field.ref}
								/>
								<FieldDescription>
									Use a positive amount. The category decides whether this is
									sent as income or expense.
								</FieldDescription>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>
				</FieldGroup>

				<div className="rounded-2xl border bg-muted/20 p-4 text-sm">
					<p className="font-medium">Mutation teaching snapshot</p>
					<p className="mt-2 text-muted-foreground">
						Status: {formatMutationStatus(createTransactionMutation.status)}
					</p>
					{selectedCategory ? (
						<div className="mt-3 flex items-center gap-2">
							<span className="text-muted-foreground">Selected type:</span>
							<span
								className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeBadgeClassName(selectedCategory.transactionType)}`}
							>
								{selectedCategory.transactionType}
							</span>
						</div>
					) : null}
				</div>

				<div className="flex flex-wrap gap-3">
					<Button
						type="submit"
						disabled={createTransactionMutation.isPending}
					>
						{createTransactionMutation.isPending ? (
							<>
								<LoaderCircle className="animate-spin" />
								Saving transaction...
							</>
						) : (
							"Save transaction"
						)}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							form.reset({
								categoryId: selectableCategories[0]?.id ?? "",
								description: "",
								amount: "",
							})
						}
						disabled={createTransactionMutation.isPending}
					>
						Reset form
					</Button>
				</div>
			</form>
		);
	})();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<PlusCircle className="size-5" />
					Add a transaction
				</CardTitle>
				<CardDescription>
					This form demonstrates a React Query mutation against an existing
					category. On success, the dashboard invalidates the balance,
					transaction, and category-metrics queries so the rest of the page can
					refresh.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">{transactionFormContent}</CardContent>
		</Card>
	);
}
