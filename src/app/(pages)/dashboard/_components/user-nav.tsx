"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { api } from "@/trpc/react";
import { LogOut, Moon, Sun } from "lucide-react";
import { useState } from "react";

export function UserNav() {
	const [isSigningOut, setIsSigningOut] = useState(false);
	const user = api.user.getUser.useQuery(undefined, {
		refetchInterval: 1000 * 10,
	});

	const signOut = api.user.signOut.useMutation({});

	const handleSignOut = async () => {
		try {
			setIsSigningOut(true);
			await signOut.mutateAsync();
		} finally {
			setIsSigningOut(false);
		}
	};

	if (user.isLoading) {
		return (
			<div className="flex items-center gap-2">
				<ThemeToggle
					lightIcon={<Sun className="size-4" />}
					darkIcon={<Moon className="size-4" />}
				/>
				<div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
			</div>
		);
	}

	if (!user.data) {
		return (
			<div className="flex items-center gap-2">
				<ThemeToggle
					lightIcon={<Sun className="size-4" />}
					darkIcon={<Moon className="size-4" />}
				/>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			{/* 🌗 Theme switcher */}
			<ThemeToggle
				lightIcon={<Sun className="size-4" />}
				darkIcon={<Moon className="size-4" />}
			/>

			{/* 👤 User dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="relative h-8 w-8 rounded-full">
						<Avatar className="h-8 w-8">
							<AvatarImage
								src={user.data.data.user?.user_metadata.avatar_url || ""}
								alt={
									user.data.data.user?.user_metadata.full_name ||
									user.data.data.user?.email
								}
							/>
							<AvatarFallback>
								{user.data.data.user?.user_metadata.full_name
									? user.data.data.user?.user_metadata.full_name
											.split(" ")
											.map((n: string) => n[0])
											.join("")
											.toUpperCase()
									: user.data.data.user?.email?.[0]?.toUpperCase() || "U"}
							</AvatarFallback>
						</Avatar>
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent className="w-56" align="end" forceMount>
					<DropdownMenuLabel className="font-normal">
						<div className="flex flex-col space-y-1">
							<p className="font-medium text-sm leading-none">
								{user.data.data.user?.user_metadata.full_name || "User"}
							</p>
							<p className="text-muted-foreground text-xs leading-none">
								{user.data.data.user?.email}
							</p>
						</div>
					</DropdownMenuLabel>

					<DropdownMenuSeparator />

					{/* Add profile/settings items later if needed */}
					<DropdownMenuItem disabled>
						<span>Profile</span>
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						onClick={handleSignOut}
						disabled={isSigningOut}
						className="cursor-pointer"
					>
						<LogOut className="mr-2 h-4 w-4" />
						<span>{isSigningOut ? "Signing out…" : "Log out"}</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
