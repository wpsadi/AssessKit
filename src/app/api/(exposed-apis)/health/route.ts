import { db } from "@/server/db";
import { events } from "@/server/db/schema";
import { arcProtect } from "@/utils/arcjet";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	try {
		const decision = await arcProtect(1, req);
		if (decision) {
			return decision;
		}

		// Test database connection
		const eventCount = await db.select().from(events).limit(1);

		return NextResponse.json({
			status: "healthy",
			message: "Quiz APIs are working!",
			database: "connected",
			endpoints: [
				"POST /api/participant/login",
				"GET /api/participant/verify",
				"GET /api/quiz/current-question?roundId=<uuid>",
				"POST /api/quiz/start-question",
				"POST /api/quiz/submit-answer",
			],
			notes: [
				"All APIs require valid authentication except login",
				"Use Bearer token in Authorization header",
				"Answers are strictly matched against answerIds array",
				"Time tracking starts when start-question is called",
			],
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		return NextResponse.json(
			{
				status: "unhealthy",
				message: "Database connection failed",
				error: error instanceof Error ? error.message : "Unknown error",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}
