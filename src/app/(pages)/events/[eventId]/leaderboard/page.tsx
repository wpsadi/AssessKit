"use client";

import { Button } from "@/components/ui/button";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/trpc/react";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowLeft, Download, RefreshCw, Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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

export default function LeaderboardPage({
	params,
	searchParams,
}: LeaderboardPageProps) {
	const [eventId, setEventId] = useState<string>("");
	const [roundId, setRoundId] = useState<string | undefined>();

	useEffect(() => {
		const loadParams = async () => {
			const resolvedParams = await params;
			const resolvedSearchParams = await searchParams;
			setEventId(resolvedParams.eventId);
			setRoundId(resolvedSearchParams.roundId);
		};
		loadParams();
	}, [params, searchParams]);

	const { data: events, isLoading: eventsLoading } =
		api.events.getEvents.useQuery(undefined, {
			refetchInterval: 1000 * 10,
		});
	const { data: rounds, isLoading: roundsLoading } =
		api.rounds.getPublicRounds.useQuery(
			{ eventId },
			{ enabled: !!eventId, refetchInterval: 1000 * 10 }, // Cache rounds for 10 seconds
		);

	const {
		data: eventLeaderboard,
		isLoading: eventLeaderboardLoading,
		refetch: refetchEventLeaderboard,
	} = api.leaderboard.getEventLeaderboard.useQuery(
		{ eventId },
		{ enabled: !!eventId && !roundId, refetchInterval: 1000 * 10 }, // Cache event leaderboard for 10 seconds
	);

	const {
		data: roundLeaderboard,
		isLoading: roundLeaderboardLoading,
		refetch: refetchRoundLeaderboard,
	} = api.leaderboard.getRoundLeaderboard.useQuery(
		// biome-ignore lint/style/noNonNullAssertion: roundId is guaranteed to be defined here
		{ roundId: roundId! },
		{ enabled: !!roundId, refetchInterval: 1000 * 10 }, // Cache round leaderboard for 10 seconds
	);

	const { data: eventStats, isLoading: statsLoading } =
		api.leaderboard.getEventStats.useQuery(
			{ eventId },
			{ enabled: !!eventId, refetchInterval: 1000 * 10 }, // Cache event stats for 10 seconds
		);

	const recalculateScoresMutation =
		api.leaderboard.recalculateEventScores.useMutation({
			onSuccess: () => {
				toast.success("Scores recalculated successfully!");
				refetchEventLeaderboard();
				refetchRoundLeaderboard();
			},
			onError: (error) => {
				toast.error(`Error recalculating scores: ${error.message}`);
			},
		});

	if (!eventId) {
		return <div>Loading...</div>;
	}

	if (eventsLoading || roundsLoading) {
		return <div>Loading...</div>;
	}

	const event = events?.find((e) => e.id === eventId);

	if (!event) {
		notFound();
	}

	const selectedRound = roundId ? rounds?.find((r) => r.id === roundId) : null;

	// Transform leaderboard data to match component interface
	let leaderboard: ComponentLeaderboardEntry[] = [];
	if (roundId && roundLeaderboard) {
		leaderboard = roundLeaderboard.map((entry) => ({
			participant: {
				id: entry.participant.id,
				name: entry.participant.name,
				email: entry.participant.email,
			},
			score: {
				total_points: entry.score.totalPoints || 0,
				total_questions: entry.score.totalQuestions || 0,
				correct_answers: entry.score.correctAnswers || 0,
				completion_time: entry.score.completionTime,
				completed_at: entry.score.completedAt
					? entry.score.completedAt.toISOString()
					: null,
			},
			rank: entry.rank,
		}));
	} else if (eventLeaderboard) {
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

	const stats: ComponentLeaderboardStats = {
		totalParticipants: Number(eventStats?.totalParticipants) || 0,
		averageScore: Number(eventStats?.averageScore) || 0,
		highestScore: Number(eventStats?.highestScore) || 0,
		completionRate: 0, // Calculate completion rate if needed
	};

	const handleRecalculateScores = () => {
		recalculateScoresMutation.mutate({ eventId });
	};

	const isLoading =
		eventLeaderboardLoading || roundLeaderboardLoading || statsLoading;

	return (
		<div className="min-h-screen bg-background">
			<header className="border-border border-b bg-card shadow-sm">
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
								<Trophy className="h-6 w-6 text-yellow-500" />
								{event.title} - Leaderboard
							</h1>
							<p className="text-muted-foreground">
								{selectedRound
									? `${selectedRound.title} Results`
									: "Overall Event Results"}
							</p>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={handleRecalculateScores}
								disabled={recalculateScoresMutation.isPending}
							>
								<RefreshCw
									className={`mr-2 h-4 w-4 ${recalculateScoresMutation.isPending ? "animate-spin" : ""}`}
								/>
								{recalculateScoresMutation.isPending
									? "Recalculating..."
									: "Recalculate Scores"}
							</Button>
							<Button variant="outline">
								<Download className="mr-2 h-4 w-4" />
								Export Results
							</Button>
						</div>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<RoundSelector
						rounds={rounds || []}
						selectedRoundId={roundId}
						eventId={eventId}
					/>
				</div>

				{isLoading ? (
					<div className="py-8 text-center">
						<p>Loading leaderboard data...</p>
					</div>
				) : (
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
				)}
			</main>
		</div>
	);
}
