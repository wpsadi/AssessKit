import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { arcProtect } from "@/utils/arcjet";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const token = getTokenFromRequest(request);

		if (!token) {
			return NextResponse.json(
				{ error: "Authorization token required" },
				{ status: 401 },
			);
		}

		const decision = await arcProtect(4, request);
		if (decision) {
			return decision;
		}

		let payload;
		try {
			payload = await verifyToken(token);
		} catch (err) {
			return NextResponse.json(
				{ error: "Invalid or expired token" },
				{ status: 401 },
			);
		}

		if (!payload) {
			return NextResponse.json(
				{ error: "Invalid or expired token" },
				{ status: 401 },
			);
		}

		return NextResponse.json({
			valid: true,
			participant: {
				id: payload.participantId,
				email: payload.email,
				name: payload.name,
				eventId: payload.eventId,
			},
		});
	} catch (error) {
		console.error("Token verification error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
