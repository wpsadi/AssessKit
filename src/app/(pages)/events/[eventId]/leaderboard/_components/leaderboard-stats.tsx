import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, TrendingUp, Trophy, Users } from "lucide-react";

interface LeaderboardStatsProps {
	stats: {
		totalParticipants: number;
		averageScore: number;
		highestScore: number;
		completionRate: number;
	};
}

export function LeaderboardStats({ stats }: LeaderboardStatsProps) {
	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="flex items-center gap-2 font-medium text-sm">
						<Users className="h-4 w-4" />
						Total Participants
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="font-bold text-2xl">{stats.totalParticipants}</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="flex items-center gap-2 font-medium text-sm">
						<TrendingUp className="h-4 w-4" />
						Average Score
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="font-bold text-2xl">{stats.averageScore}</div>
					<p className="text-gray-600 text-xs">points</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="flex items-center gap-2 font-medium text-sm">
						<Trophy className="h-4 w-4" />
						Highest Score
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="font-bold text-2xl">{stats.highestScore}</div>
					<p className="text-gray-600 text-xs">points</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="flex items-center gap-2 font-medium text-sm">
						<CheckCircle className="h-4 w-4" />
						Completion Rate
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="font-bold text-2xl">{stats.completionRate}%</div>
					<p className="text-gray-600 text-xs">completed</p>
				</CardContent>
			</Card>
		</div>
	);
}
