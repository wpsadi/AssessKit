"use client";

import { api } from "@/trpc/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UseLeaderboardProps {
	eventId: string;
	roundId?: string;
}

export function useLeaderboard({ eventId, roundId }: UseLeaderboardProps) {
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Event leaderboard query
	const {
		data: eventLeaderboard,
		isLoading: eventLeaderboardLoading,
		error: eventLeaderboardError,
		refetch: refetchEventLeaderboard,
	} = api.leaderboard.getEventLeaderboard.useQuery(
		{ eventId },
		{
			enabled: !!eventId && !roundId,
			refetchInterval: 5000,
			staleTime: 1000 * 30, // 30 seconds
		},
	);

	// Round leaderboard query
	const {
		data: roundLeaderboard,
		isLoading: roundLeaderboardLoading,
		error: roundLeaderboardError,
		refetch: refetchRoundLeaderboard,
	} = api.leaderboard.getRoundLeaderboard.useQuery(
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		{ roundId: roundId! },
		{
			enabled: !!roundId,
			refetchInterval: 5000,
			staleTime: 1000 * 30, // 30 seconds
		},
	);

	// Event stats query
	const {
		data: eventStats,
		isLoading: statsLoading,
		error: statsError,
		refetch: refetchStats,
	} = api.leaderboard.getEventStats.useQuery(
		{ eventId },
		{
			enabled: !!eventId,
			refetchInterval: 10000,
			staleTime: 1000 * 60, // 1 minute
		},
	);

	// Recalculate scores mutation
	const recalculateScoresMutation =
		api.leaderboard.recalculateEventScores.useMutation({
			onSuccess: (result) => {
				toast.success(
					`${result.message} (${result.updatedScores} records updated)`,
				);
				refreshAll();
			},
			onError: (error) => {
				toast.error(`Error recalculating scores: ${error.message}`);
			},
		});

	// Refresh all data
	const refreshAll = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await Promise.all([
				refetchEventLeaderboard(),
				refetchRoundLeaderboard(),
				refetchStats(),
			]);
			toast.success("Leaderboard data refreshed");
		} catch (error) {
			toast.error("Failed to refresh data");
		} finally {
			setIsRefreshing(false);
		}
	}, [refetchEventLeaderboard, refetchRoundLeaderboard, refetchStats]);

	// Handle score recalculation
	const handleRecalculateScores = useCallback(() => {
		recalculateScoresMutation.mutate({ eventId });
	}, [recalculateScoresMutation, eventId]);

	// Determine current data and loading state
	const currentLeaderboard = roundId ? roundLeaderboard : eventLeaderboard;
	const isLoading = roundId ? roundLeaderboardLoading : eventLeaderboardLoading;
	const error = roundId ? roundLeaderboardError : eventLeaderboardError;

	return {
		// Data
		leaderboard: currentLeaderboard,
		stats: eventStats,

		// Loading states
		isLoading: isLoading || statsLoading,
		isRefreshing,
		isRecalculating: recalculateScoresMutation.isPending,

		// Error states
		error: error || statsError,

		// Actions
		refreshAll,
		handleRecalculateScores,

		// Raw queries for advanced usage
		eventLeaderboard,
		roundLeaderboard,
	};
}
