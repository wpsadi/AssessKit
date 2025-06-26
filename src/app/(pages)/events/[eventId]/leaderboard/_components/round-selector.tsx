"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Round } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

interface RoundSelectorProps {
	rounds: Round[];
	selectedRoundId?: string;
	eventId: string;
}

export function RoundSelector({
	rounds,
	selectedRoundId,
	eventId,
}: RoundSelectorProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const handleRoundChange = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value === "all") {
			params.delete("roundId");
		} else {
			params.set("roundId", value);
		}
		router.push(`/events/${eventId}/leaderboard?${params.toString()}`);
	};

	return (
		<div className="flex items-center gap-4">
			{/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
			<label className="font-medium text-sm">View results for:</label>
			<Select
				value={selectedRoundId || "all"}
				onValueChange={handleRoundChange}
			>
				<SelectTrigger className="w-64">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Rounds (Overall)</SelectItem>
					{rounds.map((round) => (
						<SelectItem key={round.id} value={round.id}>
							{round.title}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
