// Basic validation utilities for APIs

export function isValidUUID(uuid: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function sanitizeString(input: string): string {
	return input.trim().slice(0, 1000); // Limit length and trim
}

export function validateRequiredFields(
	fields: Record<string, unknown>,
	required: string[],
): string | null {
	for (const field of required) {
		if (
			!fields[field] ||
			(typeof fields[field] === "string" && fields[field].trim() === "")
		) {
			return `Field '${field}' is required`;
		}
	}
	return null;
}
