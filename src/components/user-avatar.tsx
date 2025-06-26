"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
	name?: string | null;
	email?: string | null;
	image?: string | null;
	className?: string;
}

/**
 * Displays a user avatar image with graceful fallback to
 * the user’s initials (or “US” when no name/email is supplied).
 */
export function UserAvatar({ name, email, image, className }: UserAvatarProps) {
	const initials =
		(name ?? email ?? "")
			.split(" ")
			.filter(Boolean)
			.map((w) => w[0])
			.join("")
			.toUpperCase()
			.slice(0, 2) || "US";

	return (
		<Avatar className={className}>
			<AvatarImage
				src={image ?? undefined}
				alt={name ?? email ?? "User avatar"}
				referrerPolicy="no-referrer"
			/>
			<AvatarFallback>{initials}</AvatarFallback>
		</Avatar>
	);
}
