"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	AlertCircle,
	ArrowLeft,
	Download,
	RefreshCw,
	Trophy,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeaderboardStats } from "./_components/leaderboard-stats";
import { LeaderboardTable } from "./_components/leaderboard-table";
import { RoundSelector } from "./_components/round-selector";

import { useMemo } from "react";
import { useEventData } from "./_components/use-event-data";
import { useLeaderboard } from "./_components/use-leaderboard";
import { useLeaderboardParams } from "./_components/use-leaderboard-params";

interface LeaderboardPageProps {
	params: Promise<{ eventId: string }>;
	searchParams: Promise<{ roundId?: string }>;
}

// Utility functions for formatting
function formatDuration(seconds: number | null): string {
	if (!seconds) return "N/A";

	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;

	if (mins === 0) {
		return `${secs}s`;
	}
	return `${mins}m ${secs}s`;
}

function formatAccuracy(accuracy: number): string {
	return `${(accuracy * 100).toFixed(1)}%`;
}

function formatPoints(points: number): string {
	return points.toLocaleString();
}

interface LeaderboardDataEntry {
	participant: {
		id: string;
		name: string;
		email: string;
	};
	rank: number;
	totalPoints: number;
	totalQuestions: number;
	correctAnswers: number;
	accuracy: number;
	timeTaken: number;
	completionTime: number;
	isCompleted: boolean;
	sessionStart: string | null;
	lastActivity: string | null;
	firstResponseTime: string | null;
	lastResponseTime: string | null;
	totalSessions: number;
	completedSessions: number;
	questionsAnswered: number;
}

// Transform leaderboard data to match component interface
function transformLeaderboardData(leaderboard: LeaderboardDataEntry[], isRoundData = false) {
	if (!leaderboard) return [];

	return leaderboard.map((entry) => {
		return {
			participant: {
				id: entry.participant.id,
				name: entry.participant.name,
				email: entry.participant.email,
			},
			score: {
				total_points: entry.totalPoints,
				total_questions: entry.totalQuestions,
				correct_answers: entry.correctAnswers,
				completion_time: entry.completionTime,
				completed_at: entry.isCompleted ? entry.lastResponseTime || entry.lastActivity : null,
			},
			// Formatted display values
			points: entry.totalPoints,
			formattedPoints: formatPoints(entry.totalPoints),
			completionTime: entry.completionTime,
			formattedCompletionTime: formatDuration(entry.completionTime),
			timeSpent: entry.timeTaken,
			formattedTimeSpent: formatDuration(entry.timeTaken),
			rank: entry.rank,
			accuracy: entry.accuracy / 100, // Convert from percentage to decimal for display
			formattedAccuracy: formatAccuracy(entry.accuracy / 100),
			isCompleted: entry.isCompleted,
			roundsCompleted: isRoundData ? (entry.isCompleted ? 1 : 0) : entry.completedSessions,
			// Additional timing information for debugging/display
			sessionInfo: {
				totalSessions: entry.totalSessions,
				completedSessions: entry.completedSessions,
				sessionStart: entry.sessionStart,
				lastActivity: entry.lastActivity,
				firstResponse: entry.firstResponseTime,
				lastResponse: entry.lastResponseTime,
			},
		};
	});
}

// Loading component
function LoadingState() {
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
							<div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
						</div>
					</div>
				</div>
			</header>
			<main className="container mx-auto px-4 py-8">
				<div className="py-8 text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
					<p>Loading leaderboard...</p>
				</div>
			</main>
		</div>
	);
}

// Error component
function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
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
					</div>
				</div>
			</header>
			<main className="container mx-auto px-4 py-8">
				<Card className="py-12 text-center">
					<CardContent>
						<AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-300" />
						<h3 className="mb-2 font-semibold text-xl">
							Error Loading Leaderboard
						</h3>
						<p className="mb-4 text-gray-600">
							{error instanceof Error ? error.message : "An unexpected error occurred"}
						</p>
						<Button onClick={onRetry} variant="outline">
							<RefreshCw className="mr-2 h-4 w-4" />
							Try Again
						</Button>
					</CardContent>
				</Card>
			</main>
		</div>
	);
}

export default function LeaderboardPage({
	params,
	searchParams,
}: LeaderboardPageProps) {
	// Load URL parameters
	const { eventId, roundId, isParamsLoading, handleRoundChange } =
		useLeaderboardParams({
			params,
			searchParams,
		});

	// Load event and rounds data
	const {
		currentEvent,
		rounds,
		isLoading: eventDataLoading,
		error: eventDataError,
	} = useEventData(eventId);

	// Load leaderboard data
	const {
		leaderboard,
		stats,
		isLoading: leaderboardLoading,
		isRefreshing,
		isRecalculating,
		error: leaderboardError,
		refreshAll,
		handleRecalculateScores,
	} = useLeaderboard({ eventId, roundId });

	// Transform data for components
	const transformedLeaderboard = useMemo(() => {
		console.log(leaderboard)
		return transformLeaderboardData(leaderboard || [], !!roundId);
	}, [leaderboard, roundId]);

	const transformedStats = useMemo(() => {
		if (!stats)
			return {
				totalParticipants: 0,
				averageScore: 0,
				highestScore: 0,
				completionRate: 0,
				overallAccuracy: 0,
				totalSessions: 0,
				completedSessions: 0,
			};

		return {
			totalParticipants: stats.totalParticipants,
			averageScore: stats.averageScore,
			highestScore: stats.highestScore,
			completionRate: stats.completionRate,
			overallAccuracy: stats.overallAccuracy,
			totalSessions: stats.totalSessions,
			completedSessions: stats.completedSessions,
		};
	}, [stats]);

	// Handle export functionality
	const handleExport = () => {
		// TODO: Implement export functionality
		console.log("Exporting leaderboard data:", transformedLeaderboard);
		// You could implement CSV export, PDF generation, etc.
	};

	// Loading state
	if (isParamsLoading || eventDataLoading) {
		return <LoadingState />;
	}

	// Error state
	if (eventDataError || leaderboardError) {
		return (
			<ErrorState
				error={eventDataError || leaderboardError}
				onRetry={refreshAll}
			/>
		);
	}

	// Event not found
	if (!currentEvent) {
		notFound();
	}

	// Find selected round
	const selectedRound = roundId ? rounds?.find((r) => r.id === roundId) : null;

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
								{currentEvent.title} - Leaderboard
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
								onClick={refreshAll}
								disabled={isRefreshing}
							>
								<RefreshCw
									className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
								/>
								{isRefreshing ? "Refreshing..." : "Refresh"}
							</Button>
							<Button
								variant="outline"
								onClick={handleRecalculateScores}
								disabled={isRecalculating}
							>
								<RefreshCw
									className={`mr-2 h-4 w-4 ${isRecalculating ? "animate-spin" : ""}`}
								/>
								{isRecalculating ? "Recalculating..." : "Recalculate Scores"}
							</Button>
							<Button variant="outline" onClick={handleExport}>
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
						onRoundChange={handleRoundChange}
					/>
				</div>

				{leaderboardLoading ? (
					<div className="py-8 text-center">
						<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
						<p>Loading leaderboard data...</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
						<div className="lg:col-span-1">
							<LeaderboardStats stats={transformedStats} />
						</div>
						<div className="lg:col-span-3">
							<LeaderboardTable
								leaderboard={transformedLeaderboard}
								selectedRound={selectedRound}
							/>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
