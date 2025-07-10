import { env } from "@/env";
import { isSpoofedBot } from "@arcjet/inspect";
import arcjet, { detectBot, shield, tokenBucket } from "@arcjet/next";
import { type NextRequest, NextResponse } from "next/server";

const aj = arcjet({
	key: env.ARCJET_KEY, // Get your site key from https://app.arcjet.com
	characteristics: ["ip.src"], // Track requests by IP
	rules: [
		// Shield protects your app from common attacks e.g. SQL injection
		shield({ mode: "LIVE" }),
		// Create a bot detection rule
		// detectBot({
		// 	mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
		// 	// Block all bots except the following
		// 	allow: [
		// 		"CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
		// 		// Uncomment to allow these other common bot categories
		// 		// See the full list at https://arcjet.com/bot-list
		// 		"CATEGORY:MONITOR", // Uptime monitoring services
		// 		"CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord,
		// 		// allow postman
		// 		"CATEGORY:MONITOR",
		// 	],
		// }),
		// Create a token bucket rate limit. Other algorithms are supported.
		// 100 token for one minute
		tokenBucket({
			mode: "LIVE",
			refillRate: 100, // Refill 100 tokens per interval
			interval: 60, // Refill every 60 seconds
			capacity: 100, // Bucket capacity of 100 tokens
		}),
	],
});

export const arcProtect = async (cost: number, req: NextRequest) => {
	const decision = await aj.protect(req, { requested: cost }); // Deduct 5 tokens from the bucket

	if (decision.isDenied()) {
		if (decision.reason.isRateLimit()) {
			return NextResponse.json(
				{ error: "Too Many Requests", reason: decision.reason },
				{ status: 429 },
			);
		}
		if (decision.reason.isBot()) {
			return NextResponse.json(
				{ error: "No bots allowed", reason: decision.reason },
				{ status: 403 },
			);
		}
		return NextResponse.json(
			{ error: "Forbidden", reason: decision.reason },
			{ status: 403 },
		);
	}

	// Arcjet Pro plan verifies the authenticity of common bots using IP data.
	// Verification isn't always possible, so we recommend checking the decision
	// separately.
	// https://docs.arcjet.com/bot-protection/reference#bot-verification
	if (decision.results.some(isSpoofedBot)) {
		return NextResponse.json(
			{ error: "Forbidden", reason: decision.reason },
			{ status: 403 },
		);
	}
};

// export async function GET(req: Request) {
//     console.log("Arcjet decision", decision);

//     return NextResponse.json({ message: "Hello world" });
// }
