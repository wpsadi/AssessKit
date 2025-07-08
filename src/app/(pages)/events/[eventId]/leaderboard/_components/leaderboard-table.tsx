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
		if (!seconds || seconds === 0) return "N/A";
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	const getAccuracy = (correct: number, total: number) => {
		if (total === 0) return 0;
		return Math.round((correct / total) * 100);
	};

	const getRankBadgeColor = (rank: number) => {
		switch (rank) {
			case 1:
				return "bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300";
			case 2:
				return "bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300";
			case 3:
				return "bg-gradient-to-r from-amber-100 to-amber-200 border-amber-300";
			default:
				return "bg-gray-50 border-gray-200";
		}
	};

	// Sort leaderboard to ensure proper ranking display
	const sortedLeaderboard = [...leaderboard].sort((a, b) => {
		// Primary sort: Points (descending)
		if (a.score.total_points !== b.score.total_points) {
			return b.score.total_points - a.score.total_points;
		}
		// Secondary sort: Time (ascending - faster is better)
		const aTime = a.score.completion_time || Number.MAX_SAFE_INTEGER;
		const bTime = b.score.completion_time || Number.MAX_SAFE_INTEGER;
		return aTime - bTime;
	});

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
				{sortedLeaderboard.length === 0 ? (
					<div className="py-8 text-center text-gray-500">
						<Trophy className="mx-auto mb-4 h-12 w-12 text-gray-300" />
						<p>No results available yet</p>
					</div>
				) : (
					<div className="space-y-4">
						{sortedLeaderboard.map((entry) => (
							<div
								key={entry.participant.id}
								className={`flex items-center gap-4 rounded-lg border p-4 transition-all hover:shadow-md ${getRankBadgeColor(entry.rank)}`}
							>
								<div className="flex h-12 w-12 items-center justify-center">
									{getRankIcon(entry.rank)}
								</div>

								<Avatar className="h-10 w-10">
									<AvatarFallback className="bg-primary/10 font-semibold text-primary">
										{entry.participant.name
											.split(" ")
											.map((n) => n[0])
											.join("")
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>

								<div className="flex-1">
									<h3 className="font-semibold text-gray-900">
										{entry.participant.name}
									</h3>
									<p className="text-gray-600 text-sm">
										{entry.participant.email}
									</p>
								</div>

								<div className="flex items-center gap-6 text-sm">
									<div className="text-center">
										<div className="font-bold text-blue-600 text-lg">
											{entry.score.total_points}
										</div>
										<div className="text-gray-500 text-xs">Points</div>
									</div>

									<div className="text-center">
										<div className="flex items-center gap-1 font-semibold text-green-600">
											<Target className="h-4 w-4" />
											{getAccuracy(
												entry.score.correct_answers,
												entry.score.total_questions,
											)}
											%
										</div>
										<div className="text-gray-500 text-xs">
											{entry.score.correct_answers}/
											{entry.score.total_questions}
										</div>
									</div>

									<div className="text-center">
										<div className="flex items-center gap-1 font-semibold text-purple-600">
											<Clock className="h-4 w-4" />
											{formatTime(entry.score.completion_time)}
										</div>
										<div className="text-gray-500 text-xs">Time</div>
									</div>

									<div className="text-center">
										<Badge
											variant={
												entry.score.completed_at ? "default" : "secondary"
											}
											className={
												entry.score.completed_at
													? "bg-green-100 text-green-800 hover:bg-green-200"
													: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
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
