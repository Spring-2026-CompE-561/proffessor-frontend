"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
	email: z.email("Invalid email address."),
	password: z
		.string()
		.min(4, "Password must be at least 4 characters.")
		.max(10, "Password must be at most 10 characters."),
});

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		const res = await fetch("http://127.0.0.1:8000/api/v1/user/login", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				username: data.email,
				password: data.password,
			}).toString(),
		});

		if (!res.ok) {
			const errorData = await res.json();
			toast.error("Login failed: " + (errorData?.detail || "Unknown error"));
			console.error("Login error:", errorData);
			return;
		}

		toast("Login successful:", {
			description: (
				<pre className="mt-2 w-[320px] overflow-x-auto rounded-md bg-code p-4 text-code-foreground">
					<code>
						{res.status === 200
							? "Login successful! \n You can now access your account."
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

		localStorage.setItem("access_token", returnedData.access_token);
		/**
		 * Reset protected query caches so a previous session's error state cannot
		 * immediately leak into the newly signed-in session.
		 */
		queryClient.clear();
		router.push("/");
		return returnedData;
	}

	return (
		<div
			className={cn("flex flex-col gap-6", className)}
			{...props}
		>
			<Card>
				<CardHeader>
					<CardTitle>Sign in to Budget Buddy</CardTitle>
					<CardDescription>
						Use your email and password to access your account.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						id="form-login"
						onSubmit={form.handleSubmit(onSubmit)}
					>
						<FieldGroup>
							<Controller
								name="email"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor="form-signin-email">Email</FieldLabel>
										<Input
											{...field}
											id="form-signin-email"
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
										<FieldLabel htmlFor="form-signin-password">
											Password
										</FieldLabel>
										<Input
											{...field}
											id="form-signin-password"
											aria-invalid={fieldState.invalid}
											type="password"
											placeholder="••••••••"
											autoComplete="current-password"
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
								form="form-login"
							>
								Sign in
							</Button>
						</Field>
						<p className="text-sm text-muted-foreground">
							Need an account?{" "}
							<Link
								href="/signup"
								className="font-medium text-foreground underline underline-offset-4"
							>
								Create one
							</Link>
							.
						</p>
					</div>
				</CardFooter>
			</Card>
		</div>
	);
}
