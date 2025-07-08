import { api } from "@/trpc/react";

export function useEventData(eventId: string) {
	// Events query
	const {
		data: events,
		isLoading: eventsLoading,
		error: eventsError,
	} = api.events.getEvents.useQuery(undefined, {
		enabled: !!eventId,
		refetchInterval: 1000 * 30, // 30 seconds
		staleTime: 1000 * 60, // 1 minute
	});

	// Rounds query
	const {
		data: rounds,
		isLoading: roundsLoading,
		error: roundsError,
	} = api.rounds.getPublicRounds.useQuery(
		{ eventId },
		{
			enabled: !!eventId,
			refetchInterval: 1000 * 30, // 30 seconds
			staleTime: 1000 * 60, // 1 minute
		},
	);

	// Find current event
	const currentEvent = events?.find((e) => e.id === eventId);

	return {
		events,
		rounds,
		currentEvent,
		isLoading: eventsLoading || roundsLoading,
		error: eventsError || roundsError,
	};
}
