import { updateSession } from "@/utils/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
	const headers = request.headers;
	if (
		request.nextUrl.pathname.startsWith("/api") &&
		!request.nextUrl.pathname.startsWith("/api/trpc")
	) {
		headers.set("Access-Control-Allow-Origin", "*");
		headers.set("Access-Control-Allow-Methods", "*");
		headers.set("Access-Control-Allow-Headers", "*");
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
