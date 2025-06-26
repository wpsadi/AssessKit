import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Round } from "@/lib/types";
import { Award, Clock, Medal, Target, Trophy } from "lucide-react";

interface LeaderboardEntry {
	participant: {
		id: string;
		name: string;
		email: string;
	};
	score: {
		total_points: number;
		total_questions: number;
		correct_answers: number;
		completion_time: number | null;
		completed_at: string | null;
	};
	rank: number;
}

interface LeaderboardTableProps {
	leaderboard: LeaderboardEntry[];
	selectedRound?: Round | null;
}

export function LeaderboardTable({
	leaderboard,
	selectedRound,
}: LeaderboardTableProps) {
	const getRankIcon = (rank: number) => {
		switch (rank) {
			case 1:
				return <Trophy className="h-5 w-5 text-yellow-500" />;
			case 2:
				return <Medal className="h-5 w-5 text-gray-400" />;
			case 3:
				return <Award className="h-5 w-5 text-amber-600" />;
			default:
				return <span className="font-bold text-gray-600 text-lg">#{rank}</span>;
		}
	};

	const formatTime = (seconds: number | null) => {
		if (!seconds) return "N/A";
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	const getAccuracy = (correct: number, total: number) => {
		if (total === 0) return 0;
		return Math.round((correct / total) * 100);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Trophy className="h-5 w-5" />
					{selectedRound
						? `${selectedRound.title} Rankings`
						: "Overall Rankings"}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{leaderboard.length === 0 ? (
					<div className="py-8 text-center text-gray-500">
						<Trophy className="mx-auto mb-4 h-12 w-12 text-gray-300" />
						<p>No results available yet</p>
					</div>
				) : (
					<div className="space-y-4">
						{leaderboard.map((entry) => (
							<div
								key={entry.participant.id}
								className={`flex items-center gap-4 rounded-lg border p-4 ${
									entry.rank <= 3
										? "border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50"
										: "bg-gray-50"
								}`}
							>
								<div className="flex h-12 w-12 items-center justify-center">
									{getRankIcon(entry.rank)}
								</div>

								<Avatar className="h-10 w-10">
									<AvatarFallback>
										{entry.participant.name
											.split(" ")
											.map((n) => n[0])
											.join("")
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>

								<div className="flex-1">
									<h3 className="font-semibold">{entry.participant.name}</h3>
									<p className="text-gray-600 text-sm">
										{entry.participant.email}
									</p>
								</div>

								<div className="flex items-center gap-6 text-sm">
									<div className="text-center">
										<div className="font-bold text-blue-600 text-lg">
											{entry.score.total_points}
										</div>
										<div className="text-gray-500">Points</div>
									</div>

									<div className="text-center">
										<div className="flex items-center gap-1 font-semibold">
											<Target className="h-4 w-4" />
											{getAccuracy(
												entry.score.correct_answers,
												entry.score.total_questions,
											)}
											%
										</div>
										<div className="text-gray-500">Accuracy</div>
									</div>

									<div className="text-center">
										<div className="flex items-center gap-1 font-semibold">
											<Clock className="h-4 w-4" />
											{formatTime(entry.score.completion_time)}
										</div>
										<div className="text-gray-500">Time</div>
									</div>

									<div className="text-center">
										<Badge
											variant={
												entry.score.completed_at ? "default" : "secondary"
											}
										>
											{entry.score.completed_at ? "Completed" : "In Progress"}
										</Badge>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
