import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { eventsRouter } from "./routers/events";
import { leaderboardRouter } from "./routers/leaderboard";
import { participantsRouter } from "./routers/participants";
import { questionsRouter } from "./routers/questions";
import { responsesRouter } from "./routers/responses";
import { roundsRouter } from "./routers/rounds";
import { userRouter } from "./routers/user";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	user: userRouter,
	events: eventsRouter,
	participants: participantsRouter,
	questions: questionsRouter,
	responses: responsesRouter,
	leaderboard: leaderboardRouter,
	rounds: roundsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
