"use client";

import Link from "next/link";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const signupSchema = z
	.object({
		email: z.email("Invalid email address."),
		password: z
			.string()
			.min(4, "Password must be at least 4 characters.")
			.max(32, "Password must be at most 32 characters."),
		confirmPassword: z.string(),
	})
	.refine((values) => values.password === values.confirmPassword, {
		message: "Passwords do not match.",
		path: ["confirmPassword"],
	});

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const form = useForm<SignupValues>({
		resolver: zodResolver(signupSchema),
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
		},
	});
	const router = useRouter();

	async function onSubmit(data: SignupValues) {
		const res = await fetch("http://127.0.0.1:8000/api/v1/user/register", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!res.ok) {
			const errorData = await res.json();
			toast.error(
				"Registration failed: " + (errorData?.detail || "Unknown error"),
			);
			return;
		}

		toast("Your account details are ready:", {
			description: (
				<pre className="mt-2 w-[320px] overflow-x-auto rounded-md bg-code p-4 text-code-foreground">
					<code>
						{res.status === 201
							? "Account created successfully! \n You can now sign in."
							: "Unexpected response from server."}
					</code>
				</pre>
			),
			position: "bottom-right",
			classNames: {
				content: "flex flex-col gap-2",
			},
			style: {
				"--border-radius": "calc(var(--radius) + 4px)",
			} as React.CSSProperties,
		});

		const returnedData = await res.json();

		router.push("/signin");
		return returnedData;
	}

	return (
		<div
			className={cn("flex flex-col gap-6", className)}
			{...props}
		>
			<Card>
				<CardHeader>
					<CardTitle>Create your Budget Buddy account</CardTitle>
					<CardDescription>
						Add a few details below to get started.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						id="form-signup"
						onSubmit={form.handleSubmit(onSubmit)}
					>
						<FieldGroup>
							<Controller
								name="email"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor="form-signup-email">Email</FieldLabel>
										<Input
											{...field}
											id="form-signup-email"
											aria-invalid={fieldState.invalid}
											placeholder="m@example.com"
											autoComplete="email"
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
							<Controller
								name="password"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor="form-signup-password">
											Password
										</FieldLabel>
										<Input
											{...field}
											id="form-signup-password"
											aria-invalid={fieldState.invalid}
											type="password"
											placeholder="••••••••"
											autoComplete="new-password"
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
							<Controller
								name="confirmPassword"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor="form-signup-confirm-password">
											Confirm password
										</FieldLabel>
										<Input
											{...field}
											id="form-signup-confirm-password"
											aria-invalid={fieldState.invalid}
											type="password"
											placeholder="••••••••"
											autoComplete="new-password"
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</FieldGroup>
					</form>
				</CardContent>
				<CardFooter>
					<div className="flex w-full flex-col gap-4">
						<Field orientation="horizontal">
							<Button
								type="button"
								variant="outline"
								onClick={() => form.reset()}
							>
								Reset
							</Button>
							<Button
								type="submit"
								form="form-signup"
							>
								Create account
							</Button>
						</Field>
						<p className="text-sm text-muted-foreground">
							Already have an account?{" "}
							<Link
								href="/signin"
								className="font-medium text-foreground underline underline-offset-4"
							>
								Sign in
							</Link>
							.
						</p>
					</div>
				</CardFooter>
			</Card>
		</div>
	);
}
