import { updateSession } from "@/utils/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

const corsOptions = {
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function middleware(request: NextRequest) {
	if (
		request.nextUrl.pathname.startsWith("/api") &&
		!request.nextUrl.pathname.startsWith("/api/trpc")
	) {
		const origin = request.headers.get("origin") ?? "";

		const isAllowedOrigin = true;

		// Handle preflighted requests
		const isPreflight = request.method === "OPTIONS";

		if (isPreflight) {
			const preflightHeaders = {
				...(isAllowedOrigin && { "Access-Control-Allow-Origin": origin }),
				...corsOptions,
			};
			return NextResponse.json({}, { headers: preflightHeaders });
		}

		// Handle simple requests
		const response = NextResponse.next();

		if (isAllowedOrigin) {
			response.headers.set("Access-Control-Allow-Origin", origin);
		}

		// biome-ignore lint/complexity/noForEach: <explanation>
		Object.entries(corsOptions).forEach(([key, value]) => {
			response.headers.set(key, value);
		});

		// Check for "error" field in JSON response and add "message" field
		const clonedResponse = response.clone();
		const responseBody = await clonedResponse.json().catch(() => null);
		if (responseBody?.error) {
			responseBody.message = responseBody.error;
			return NextResponse.json(responseBody, {
				headers: response.headers,
			});
		}

		return response;
	}
	return await updateSession(request);
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * Feel free to modify this pattern to include more paths.
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
