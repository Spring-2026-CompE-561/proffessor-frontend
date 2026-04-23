"use client";

import { cn } from "@/lib/utils";
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
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

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
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	function onSubmit(data: z.infer<typeof formSchema>) {
		toast("You submitted the following values:", {
			description: (
				<pre className="mt-2 w-[320px] overflow-x-auto rounded-md bg-code p-4 text-code-foreground">
					<code>{JSON.stringify(data, null, 2)}</code>
				</pre>
			),
			position: "bottom-right",
			classNames: {
				content: "flex flex-col gap-2",
			},
			style: {
				"--border-radius": "calc(var(--radius)  + 4px)",
			} as React.CSSProperties,
		});
	}

	return (
		<div
			className={cn("flex flex-col gap-6", className)}
			{...props}
		>
			<Card>
				<CardHeader>
					<CardTitle>Login to Budget Buddy</CardTitle>
					<CardDescription>
						Enter your email below to login to your account
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
											autoComplete="off"
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
											autoComplete="off"
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
							Submit
						</Button>
					</Field>
				</CardFooter>
			</Card>
		</div>
	);
}
