"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

export default function Navbar() {
	return (
		<nav className="w-full border-b bg-slate-800 text-white ">
			<div className="mx-auto max-w-7xl px-4">
				<div className="flex h-16 items-center justify-between">
					{/* Logo */}
					<div className="text-lg font-semibold">
						<Link href="/">Budget Buddy</Link>
					</div>

					{/* Desktop Menu */}
					<div className="hidden md:flex items-center gap-6">
						<Link
							href="/"
							className="hover:text-gray-600"
						>
							Home
						</Link>
						<Link
							href="/about"
							className="hover:text-gray-600"
						>
							About
						</Link>
					</div>

					{/* Mobile Button */}
					<Sheet>
						<SheetTrigger asChild>
							<Button>Menu</Button>
						</SheetTrigger>

						<SheetContent>
							<Link href="/">Home</Link>
							<Link href="/about">About</Link>
							<Link href="/contact">Contact</Link>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</nav>
	);
}
