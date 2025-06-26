"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function FloatingThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	const toggleTheme = () => {
		setTheme(theme === "dark" ? "light" : "dark");
	};

	return (
		<div className="fixed right-6 bottom-6 z-50">
			<Button
				onClick={toggleTheme}
				size="lg"
				className="h-14 w-14 rounded-full border-2 border-white bg-gradient-to-r from-orange-400 to-pink-400 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl dark:border-gray-800 dark:from-blue-600 dark:to-purple-600"
				aria-label="Toggle theme"
			>
				<div className="relative">
					<Sun
						className={`h-6 w-6 text-white transition-all duration-500 ${
							theme === "dark"
								? "rotate-90 scale-0 opacity-0"
								: "rotate-0 scale-100 opacity-100"
						}`}
					/>
					<Moon
						className={`absolute inset-0 h-6 w-6 text-white transition-all duration-500 ${
							theme === "dark"
								? "rotate-0 scale-100 opacity-100"
								: "-rotate-90 scale-0 opacity-0"
						}`}
					/>
				</div>
			</Button>
		</div>
	);
}
