import { Button } from "@/components/ui/button";
import type { Round } from "@/lib/types";
import { api } from "@/trpc/server";
import { ArrowLeft, Download, Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeaderboardStats } from "./_components/leaderboard-stats";
import { LeaderboardTable } from "./_components/leaderboard-table";
import { RoundSelector } from "./_components/round-selector";

// Local interfaces to match component expectations
interface ComponentLeaderboardEntry {
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

interface ComponentLeaderboardStats {
	totalParticipants: number;
	averageScore: number;
	highestScore: number;
	completionRate: number;
}

interface LeaderboardPageProps {
	params: Promise<{ eventId: string }>;
	searchParams: Promise<{ roundId?: string }>;
}

export default async function LeaderboardPage({
	params,
	searchParams,
}: LeaderboardPageProps) {
	const { eventId } = await params;
	const { roundId } = await searchParams;

	try {
		// Get event details
		const events = await api.events.getEvents();
		const event = events.find((e) => e.id === eventId);

		if (!event) {
			notFound();
		}

		// Get rounds for the event (we'll need to create a public version)
		let rounds: Round[] = [];
		let leaderboard: ComponentLeaderboardEntry[] = [];
		let stats: ComponentLeaderboardStats = {
			totalParticipants: 0,
			averageScore: 0,
			highestScore: 0,
			completionRate: 0,
		};

		try {
			// Get rounds for the event using the public endpoint
			rounds = await api.rounds.getPublicRounds({ eventId });

			// Get leaderboard data
			if (roundId) {
				const roundLeaderboard = await api.leaderboard.getRoundLeaderboard({
					roundId,
				});
				// Transform the data to match the component interface
				leaderboard = roundLeaderboard.map((entry) => ({
					participant: {
						id: entry.participant.id,
						name: entry.participant.name,
						email: entry.participant.email,
					},
					score: {
						total_points: entry.score.totalPoints,
						total_questions: entry.score.totalQuestions,
						correct_answers: entry.score.correctAnswers,
						completion_time: entry.score.completionTime,
						completed_at: entry.score.completedAt
							? entry.score.completedAt.toISOString()
							: null,
					},
					rank: entry.rank,
				}));
			} else {
				const eventLeaderboard = await api.leaderboard.getEventLeaderboard({
					eventId,
				});
				// Transform the data to match the component interface
				leaderboard = eventLeaderboard.map((entry) => ({
					participant: {
						id: entry.participant.id,
						name: entry.participant.name,
						email: entry.participant.email,
					},
					score: {
						total_points: Number(entry.totalPoints) || 0,
						total_questions: Number(entry.totalQuestions) || 0,
						correct_answers: Number(entry.correctAnswers) || 0,
						completion_time: Number(entry.completionTime) || 0,
						completed_at: new Date().toISOString(),
					},
					rank: entry.rank,
				}));
			}

			// Get event stats
			const eventStats = await api.leaderboard.getEventStats({ eventId });
			stats = {
				totalParticipants: eventStats.totalParticipants,
				averageScore: Number(eventStats.averageScore) || 0,
				highestScore: Number(eventStats.highestScore) || 0,
				completionRate: 0, // Calculate completion rate if needed
			};
		} catch (error) {
			console.error("Error loading leaderboard data:", error);
		}

		const selectedRound = roundId ? rounds.find((r) => r.id === roundId) : null;

		return (
			<div className="min-h-screen bg-gray-50">
				<header className="border-b bg-white shadow-sm">
					<div className="container mx-auto px-4 py-4">
						<div className="flex items-center gap-4">
							<Link href="/dashboard">
								<Button variant="ghost" size="sm">
									<ArrowLeft className="mr-2 h-4 w-4" />
									Back to Dashboard
								</Button>
							</Link>
							<div className="flex-1">
								<h1 className="flex items-center gap-2 font-bold text-2xl">
									<Trophy className="h-6 w-6 text-yellow-600" />
									{event.title} - Leaderboard
								</h1>
								<p className="text-gray-600">
									{selectedRound
										? `${selectedRound.title} Results`
										: "Overall Event Results"}
								</p>
							</div>
							<Button variant="outline">
								<Download className="mr-2 h-4 w-4" />
								Export Results
							</Button>
						</div>
					</div>
				</header>

				<main className="container mx-auto px-4 py-8">
					<div className="mb-8">
						<RoundSelector
							rounds={rounds}
							selectedRoundId={roundId}
							eventId={eventId}
						/>
					</div>

					<div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
						<div className="lg:col-span-1">
							<LeaderboardStats stats={stats} />
						</div>
						<div className="lg:col-span-3">
							<LeaderboardTable
								leaderboard={leaderboard}
								selectedRound={selectedRound}
							/>
						</div>
					</div>
				</main>
			</div>
		);
	} catch (error) {
		console.error("Error loading event:", error);
		return (
			<div className="container mx-auto py-8">
				<div className="text-center">
					<h1 className="font-bold text-2xl text-red-600">Error</h1>
					<p className="mt-2 text-gray-600">Failed to load leaderboard data</p>
				</div>
			</div>
		);
	}
}
