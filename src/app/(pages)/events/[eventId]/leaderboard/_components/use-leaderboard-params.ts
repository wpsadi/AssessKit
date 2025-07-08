"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface UseLeaderboardParamsProps {
	params: Promise<{ eventId: string }>;
	searchParams: Promise<{ roundId?: string }>;
}

export function useLeaderboardParams({
	params,
	searchParams,
}: UseLeaderboardParamsProps) {
	const [eventId, setEventId] = useState<string>("");
	const [roundId, setRoundId] = useState<string | undefined>();
	const [isParamsLoading, setIsParamsLoading] = useState(true);

	const router = useRouter();
	const currentSearchParams = useSearchParams();

	// Load async params
	useEffect(() => {
		const loadParams = async () => {
			try {
				const resolvedParams = await params;
				const resolvedSearchParams = await searchParams;
				setEventId(resolvedParams.eventId);
				setRoundId(resolvedSearchParams.roundId);
			} catch (error) {
				console.error("Error loading params:", error);
			} finally {
				setIsParamsLoading(false);
			}
		};
		loadParams();
	}, [params, searchParams]);

	// Handle round selection
	const handleRoundChange = (newRoundId: string) => {
		const params = new URLSearchParams(currentSearchParams.toString());
		if (newRoundId === "all") {
			params.delete("roundId");
		} else {
			params.set("roundId", newRoundId);
		}
		router.push(`/events/${eventId}/leaderboard?${params.toString()}`);
	};

	return {
		eventId,
		roundId,
		isParamsLoading,
		handleRoundChange,
	};
}
