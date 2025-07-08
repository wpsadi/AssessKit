import { createHash } from "node:crypto";

const JWT_SECRET =
	process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface TokenPayload {
	participantId: string;
	eventId: string;
	email: string;
	name: string;
	exp: number;
}

export function generateToken(payload: Omit<TokenPayload, "exp">): string {
	if (!payload.eventId) {
		throw new Error("Token payload must include eventId");
	}

	const tokenPayload: TokenPayload = {
		...payload,
		exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours from now
	};

	const tokenData = JSON.stringify(tokenPayload);
	console.log("Generating token with data:", tokenData);

	const signature = createHash("sha256")
		.update(`${tokenData}${JWT_SECRET}`)
		.digest("hex");

	console.log("Generated signature:", signature);

	const token = Buffer.from(`${tokenData}.${signature}`).toString("base64");
	console.log("Generated token:", `${token.substring(0, 50)}...`);

	return token;
}

export function verifyToken(token: string): TokenPayload | null {
	try {
		console.log("Verifying token:", `${token.substring(0, 50)}...`);

		const decoded = Buffer.from(token, "base64").toString("utf8");
		console.log("Decoded token:", `${decoded.substring(0, 100)}...`);

		// Find the last dot to split tokenData and signature properly
		const lastDotIndex = decoded.lastIndexOf(".");
		if (lastDotIndex === -1) {
			console.log("No separator found between token data and signature");
			return null;
		}

		const tokenData = decoded.substring(0, lastDotIndex);
		const signature = decoded.substring(lastDotIndex + 1);

		if (!tokenData || !signature) {
			console.log("Missing tokenData or signature");
			return null;
		}

		console.log("TokenData length:", tokenData.length);
		console.log("Signature length:", signature.length);

		const expectedSignature = createHash("sha256")
			.update(`${tokenData}${JWT_SECRET}`)
			.digest("hex");

		console.log("Expected signature:", expectedSignature);
		console.log("Actual signature:", signature);
		console.log("Signatures match:", signature === expectedSignature);

		if (signature !== expectedSignature) {
			console.log("Signature verification failed");
			return null;
		}

		const payload = JSON.parse(tokenData) as TokenPayload;
		console.log("Parsed payload:", payload);

		// Check if token is expired
		const now = Math.floor(Date.now() / 1000);
		console.log(
			"Token exp:",
			payload.exp,
			"Current time:",
			now,
			"Valid:",
			payload.exp > now,
		);

		if (payload.exp < now) {
			console.log("Token expired");
			return null;
		}

		console.log("Token verification successful");
		return payload;
	} catch (error) {
		console.error("Token verification failed:", error);
		return null;
	}
}

export function getTokenFromRequest(request: Request): string | null {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return null;
	}
	return authHeader.substring(7);
}
