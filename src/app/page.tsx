"use client";

import { TextFlippingBoard } from "@/components/ui/text-flipping-board";
import { useCallback, useState, useEffect } from "react";

const MESSAGES: string[] = [
	"Need Money? \n Study hard! \n- STEVE JOBS",
	"What did you get done this week?",
	"LADIES AND GENTLEMEN \nWELCOME TO F#!@# C!@$",
];

export default function Home() {
	const [msgIdx, setMsgIdx] = useState(0);
	const next = useCallback(
		() => setMsgIdx((i) => (i + 1) % MESSAGES.length),
		[],
	);

	useEffect(() => {
		const id = setInterval(next, 6000);
		return () => clearInterval(id);
	}, [next]);

	return (
		<div className="flex w-full flex-col items-center justify-center gap-8 py-20">
			<TextFlippingBoard text={MESSAGES[msgIdx]} />
		</div>
	);
}
