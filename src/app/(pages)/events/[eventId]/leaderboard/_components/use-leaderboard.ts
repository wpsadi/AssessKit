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

	// Main leaderboard query - works for both event and round
	const {
		data: leaderboard,
		isLoading: leaderboardLoading,
		error: leaderboardError,
		refetch: refetchLeaderboard,
	} = api.leaderboard.getLeaderboard.useQuery(
		{ eventId, roundId },
		{
			enabled: !!eventId,
			refetchInterval: 1000 * 30, // 30 seconds
			staleTime: 1000 * 25, // 25 seconds,
			retry: 0,
		},
	);

	// Event stats query
	const {
		data: stats,
		isLoading: statsLoading,
		error: statsError,
		refetch: refetchStats,
	} = api.leaderboard.getEventStats.useQuery(
		{ eventId },
		{
			enabled: !!eventId,
			refetchInterval: 1000 * 30, // 30 seconds
			staleTime: 1000 * 25, // 25 seconds,
			retry: 0,
		},
	);

	// Refresh all data
	const refreshAll = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await Promise.all([refetchLeaderboard(), refetchStats()]);
			toast.success("Leaderboard data refreshed");
		} catch (error) {
			toast.error("Failed to refresh data");
		} finally {
			setIsRefreshing(false);
		}
	}, [refetchLeaderboard, refetchStats]);

	// Handle score recalculation (placeholder - can be implemented later)
	const handleRecalculateScores = useCallback(() => {
		toast.info("Score recalculation feature coming soon");
	}, []);

	return {
		// Data
		leaderboard,
		stats,

		// Loading states
		isLoading: leaderboardLoading || statsLoading,
		isRefreshing,
		isRecalculating: false,

		// Error states
		error: leaderboardError || statsError,

		// Actions
		refreshAll,
		handleRecalculateScores,
	};
}
