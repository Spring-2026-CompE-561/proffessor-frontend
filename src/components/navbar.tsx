"use client";
import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
	const [isOpen, setIsOpen] = useState(false);
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
					<button
						onClick={() => setIsOpen(!isOpen)}
						className="md:hidden text-sm border px-3 py-1 rounded"
					>
						Menu
					</button>
				</div>
			</div>

			{/* Mobile Menu */}
			{isOpen && (
				<div className="md:hidden px-4 pb-4 space-y-2">
					<Link
						href="/"
						className="block"
					>
						Home
					</Link>
					<Link
						href="/about"
						className="block"
					>
						About
					</Link>
					<Link
						href="/contact"
						className="block"
					>
						Contact
					</Link>
				</div>
			)}
		</nav>
	);
}
