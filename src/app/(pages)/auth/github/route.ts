import { env } from "@/env";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

export const GET = async () => {
	const supabase = await createClient();

	const callbackURL = new URL(
		"/auth/github/callback",
		env.NEXT_PUBLIC_APP_URL,
	).toString();

	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: "github",
		options: {
			redirectTo: callbackURL,
		},
	});

	if (data.url) {
		return NextResponse.redirect(data.url); // use the redirect API for your server framework
	}

	return NextResponse.json(error);
};
