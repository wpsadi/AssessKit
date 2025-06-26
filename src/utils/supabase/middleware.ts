import { env } from "@/env";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
const protectedPaths: string[] = ["/dashboard", "/events", "/rounds"];
export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabase = createServerClient(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					for (const { name, value } of cookiesToSet) {
						request.cookies.set(name, value);
					}
					supabaseResponse = NextResponse.next({
						request,
					});
					for (const { name, value, options } of cookiesToSet) {
						supabaseResponse.cookies.set(name, value, options);
					}
				},
			},
		},
	);

	// Do not run code between createServerClient and
	// supabase.auth.getUser(). A simple mistake could make it very hard to debug
	// issues with users being randomly logged out.

	// IMPORTANT: DO NOT REMOVE auth.getUser()

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (
		!user &&
		!request.nextUrl.pathname.startsWith("/login") &&
		!request.nextUrl.pathname.startsWith("/auth")
	) {
		// no user, potentially respond by redirecting the user to the login page
		if (
			protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))
		) {
			// if the request is for a protected path, redirect to login
			const url = request.nextUrl.clone();
			url.pathname = "/auth";
			// url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
			return NextResponse.redirect(url);
		}
	}

	// IMPORTANT: You *must* return the supabaseResponse object as it is.
	// If you're creating a new response object with NextResponse.next() make sure to:
	// 1. Pass the request in it, like so:
	//    const myNewResponse = NextResponse.next({ request })
	// 2. Copy over the cookies, like so:
	//    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
	// 3. Change the myNewResponse object to fit your needs, but avoid changing
	//    the cookies!
	// 4. Finally:
	//    return myNewResponse
	// If this is not done, you may be causing the browser and server to go out
	// of sync and terminate the user's session prematurely!

	// still we need to make sure user email is completely genuine
	const emailVerified = user?.user_metadata.email_verified;

	if (request.nextUrl.pathname === "/auth/login") {
		// if the user is already logged in, redirect to the dashboard
		if (user && emailVerified) {
			const url = request.nextUrl.clone();
			url.pathname = "/dashboard";
			return NextResponse.redirect(url);
		}
	}

	return supabaseResponse;
}
