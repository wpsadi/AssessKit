"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Round } from "@/lib/types";

interface RoundSelectorProps {
	rounds: Round[];
	selectedRoundId?: string;
	eventId: string;
	onRoundChange: (roundId: string) => void;
}

export function RoundSelector({
	rounds,
	selectedRoundId,
	eventId,
	onRoundChange,
}: RoundSelectorProps) {
	return (
		<div className="flex items-center gap-4">
			<label className="font-medium text-sm">View results for:</label>
			<Select value={selectedRoundId || "all"} onValueChange={onRoundChange}>
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
