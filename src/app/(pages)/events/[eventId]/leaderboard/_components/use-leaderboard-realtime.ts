"use client";

import { useEffect, useRef } from "react";

interface UseLeaderboardRealtimeProps {
	eventId: string;
	onUpdate?: () => void;
	enabled?: boolean;
}

export function useLeaderboardRealtime({
	eventId,
	onUpdate,
	enabled = true,
}: UseLeaderboardRealtimeProps) {
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const lastUpdateRef = useRef<number>(Date.now());

	useEffect(() => {
		if (!enabled || !eventId) return;

		// Set up polling interval for real-time updates
		intervalRef.current = setInterval(() => {
			const now = Date.now();
			const timeSinceLastUpdate = now - lastUpdateRef.current;

			// Only show notification if it's been more than 30 seconds since last update
			if (timeSinceLastUpdate > 30000) {
				onUpdate?.();
				lastUpdateRef.current = now;
			}
		}, 5000); // Check every 5 seconds

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [eventId, enabled, onUpdate]);

	// Manual trigger for updates
	const triggerUpdate = () => {
		onUpdate?.();
		lastUpdateRef.current = Date.now();
	};

	return {
		triggerUpdate,
	};
}
