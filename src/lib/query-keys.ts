/**
 * Centralized query key factory for TanStack Query
 * Provides consistent, unique query keys with hash-like properties
 */

import type { QueryClient } from "@tanstack/react-query";

// Base query key factory
export const queryKeys = {
    // Events
    events: {
        all: () => ["events"] as const,
        lists: () => [...queryKeys.events.all(), "list"] as const,
        list: (filters: Record<string, unknown> = {}) =>
            [
                ...queryKeys.events.lists(),
                createQueryHash("events-list", filters),
            ] as const,
        details: () => [...queryKeys.events.all(), "detail"] as const,
        detail: (id: string) =>
            [
                ...queryKeys.events.details(),
                createQueryHash("event", { id }),
            ] as const,
    },

    // Rounds
    rounds: {
        all: () => ["rounds"] as const,
        lists: () => [...queryKeys.rounds.all(), "list"] as const,
        list: (eventId: string, filters: Record<string, unknown> = {}) =>
            [
                ...queryKeys.rounds.lists(),
                createQueryHash("rounds-list", { eventId, ...filters }),
            ] as const,
        details: () => [...queryKeys.rounds.all(), "detail"] as const,
        detail: (id: string) =>
            [
                ...queryKeys.rounds.details(),
                createQueryHash("round", { id }),
            ] as const,
        publicList: (eventId: string) =>
            [
                ...queryKeys.rounds.lists(),
                createQueryHash("rounds-public", { eventId }),
            ] as const,
    },

    // Questions
    questions: {
        all: () => ["questions"] as const,
        lists: () => [...queryKeys.questions.all(), "list"] as const,
        list: (roundId: string, filters: Record<string, unknown> = {}) =>
            [
                ...queryKeys.questions.lists(),
                createQueryHash("questions-list", { roundId, ...filters }),
            ] as const,
        details: () => [...queryKeys.questions.all(), "detail"] as const,
        detail: (id: string) =>
            [
                ...queryKeys.questions.details(),
                createQueryHash("question", { id }),
            ] as const,
        byRound: (roundId: string) =>
            [
                ...queryKeys.questions.lists(),
                createQueryHash("questions-by-round", { roundId }),
            ] as const,
    },

    // Participants
    participants: {
        all: () => ["participants"] as const,
        lists: () => [...queryKeys.participants.all(), "list"] as const,
        list: (eventId: string, filters: Record<string, unknown> = {}) =>
            [
                ...queryKeys.participants.lists(),
                createQueryHash("participants-list", { eventId, ...filters }),
            ] as const,
        details: () => [...queryKeys.participants.all(), "detail"] as const,
        detail: (id: string) =>
            [
                ...queryKeys.participants.details(),
                createQueryHash("participant", { id }),
            ] as const,
        byEvent: (eventId: string) =>
            [
                ...queryKeys.participants.lists(),
                createQueryHash("participants-by-event", { eventId }),
            ] as const,
    },

    // Responses
    responses: {
        all: () => ["responses"] as const,
        lists: () => [...queryKeys.responses.all(), "list"] as const,
        list: (filters: Record<string, unknown> = {}) =>
            [
                ...queryKeys.responses.lists(),
                createQueryHash("responses-list", filters),
            ] as const,
        details: () => [...queryKeys.responses.all(), "detail"] as const,
        detail: (id: string) =>
            [
                ...queryKeys.responses.details(),
                createQueryHash("response", { id }),
            ] as const,
        byParticipant: (participantId: string) =>
            [
                ...queryKeys.responses.lists(),
                createQueryHash("responses-by-participant", { participantId }),
            ] as const,
        byQuestion: (questionId: string) =>
            [
                ...queryKeys.responses.lists(),
                createQueryHash("responses-by-question", { questionId }),
            ] as const,
        byRound: (roundId: string) =>
            [
                ...queryKeys.responses.lists(),
                createQueryHash("responses-by-round", { roundId }),
            ] as const,
    },

    // Leaderboard
    leaderboard: {
        all: () => ["leaderboard"] as const,
        lists: () => [...queryKeys.leaderboard.all(), "list"] as const,
        byEvent: (eventId: string, filters: Record<string, unknown> = {}) =>
            [
                ...queryKeys.leaderboard.lists(),
                createQueryHash("leaderboard-by-event", {
                    eventId,
                    ...filters,
                }),
            ] as const,
        byRound: (roundId: string, filters: Record<string, unknown> = {}) =>
            [
                ...queryKeys.leaderboard.lists(),
                createQueryHash("leaderboard-by-round", {
                    roundId,
                    ...filters,
                }),
            ] as const,
    },

    // User
    user: {
        all: () => ["user"] as const,
        details: () => [...queryKeys.user.all(), "detail"] as const,
        session: () => [...queryKeys.user.all(), "session"] as const,
        profile: () => [...queryKeys.user.all(), "profile"] as const,
    },
} as const;

/**
 * Creates a unique hash-like key for query caching
 * Uses a simple hash function that works in Edge Runtime
 */
function createQueryHash(
    prefix: string,
    data: Record<string, unknown>,
): string {
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    const fullString = `${prefix}:${serialized}`;

    // Simple hash function that works in Edge Runtime
    let hash = 0;
    for (let i = 0; i < fullString.length; i++) {
        const char = fullString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Convert to positive number and then to hex
    const hashHex = Math.abs(hash).toString(16);
    return `${prefix}-${hashHex.padStart(8, "0")}`;
}

/**
 * Helper function to invalidate all related queries for an entity
 */
export const invalidateEntityQueries = {
    events: (queryClient: QueryClient, eventId?: string) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.events.all() });
        if (eventId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.rounds.list(eventId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.participants.byEvent(eventId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.leaderboard.byEvent(eventId),
            });
        }
    },

    rounds: (queryClient: QueryClient, eventId: string, roundId?: string) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.rounds.all() });
        queryClient.invalidateQueries({
            queryKey: queryKeys.rounds.list(eventId),
        });
        queryClient.invalidateQueries({
            queryKey: queryKeys.rounds.publicList(eventId),
        });
        if (roundId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.questions.byRound(roundId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.responses.byRound(roundId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.leaderboard.byRound(roundId),
            });
        }
    },

    questions: (
        queryClient: QueryClient,
        roundId: string,
        questionId?: string,
    ) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.questions.all() });
        queryClient.invalidateQueries({
            queryKey: queryKeys.questions.byRound(roundId),
        });
        if (questionId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.responses.byQuestion(questionId),
            });
        }
    },

    participants: (
        queryClient: QueryClient,
        eventId: string,
        participantId?: string,
    ) => {
        queryClient.invalidateQueries({
            queryKey: queryKeys.participants.all(),
        });
        queryClient.invalidateQueries({
            queryKey: queryKeys.participants.byEvent(eventId),
        });
        queryClient.invalidateQueries({
            queryKey: queryKeys.leaderboard.byEvent(eventId),
        });
        if (participantId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.responses.byParticipant(participantId),
            });
        }
    },

    responses: (
        queryClient: QueryClient,
        participantId: string,
        questionId?: string,
        roundId?: string,
    ) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.responses.all() });
        queryClient.invalidateQueries({
            queryKey: queryKeys.responses.byParticipant(participantId),
        });
        if (questionId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.responses.byQuestion(questionId),
            });
        }
        if (roundId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.responses.byRound(roundId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.leaderboard.byRound(roundId),
            });
        }
    },
};
