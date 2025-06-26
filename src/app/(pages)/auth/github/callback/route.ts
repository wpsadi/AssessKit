import { env } from "@/env";
// The client you created from the Server-Side Auth instructions
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");
	// if "next" is in param, use it as the redirect URL
	let next = searchParams.get("next") ?? "/";
	if (!next.startsWith("/")) {
		// if "next" is not a relative URL, use the default
		next = "/";
	}

	if (code) {
		const supabase = await createClient();
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			console.log("OAuth callback success:", code, request.url);
			return NextResponse.redirect(
				new URL("/dashboard", env.NEXT_PUBLIC_APP_URL).toString(),
			);
		}
	}

	console.error("OAuth callback error:", code, request.url);

	// return the user to an error page with instructions
	return NextResponse.redirect(
		new URL("/auth/github/auth-code-error", env.NEXT_PUBLIC_APP_URL).toString(),
	);
}
