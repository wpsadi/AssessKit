import { NextResponse } from "next/server";

export const GET = () => {
	return NextResponse.json({ error: "OAuth callback error" });
};
