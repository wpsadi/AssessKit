"use client";

import { useCallback } from "react";
import { toast } from "sonner";

interface LeaderboardEntry {
	participant: {
		id: string;
		name: string;
		email: string;
	};
	score: {
		total_points: number;
		total_questions: number;
		correct_answers: number;
		completion_time: number | null;
		completed_at: string | null;
	};
	rank: number;
	accuracy?: number;
	isCompleted?: boolean;
	roundsCompleted?: number;
}

export function useLeaderboardExport() {
	const exportToCSV = useCallback(
		(data: LeaderboardEntry[], filename = "leaderboard") => {
			try {
				// Create CSV headers
				const headers = [
					"Rank",
					"Name",
					"Email",
					"Points",
					"Questions",
					"Correct",
					"Accuracy (%)",
					"Completion Time (min)",
					"Status",
					"Rounds Completed",
					"Completed At",
				];

				// Convert data to CSV rows
				const rows = data.map((entry) => [
					entry.rank,
					entry.participant.name,
					entry.participant.email,
					entry.score.total_points,
					entry.score.total_questions,
					entry.score.correct_answers,
					entry.accuracy || 0,
					entry.score.completion_time
						? Math.round(entry.score.completion_time / 60)
						: "N/A",
					entry.isCompleted ? "Completed" : "In Progress",
					entry.roundsCompleted || 0,
					entry.score.completed_at || "N/A",
				]);

				// Combine headers and rows
				const csvContent = [headers, ...rows]
					.map((row) => row.map((cell) => `"${cell}"`).join(","))
					.join("\n");

				// Create and download file
				const blob = new Blob([csvContent], {
					type: "text/csv;charset=utf-8;",
				});
				const link = document.createElement("a");
				const url = URL.createObjectURL(blob);

				link.setAttribute("href", url);
				link.setAttribute(
					"download",
					`${filename}-${new Date().toISOString().split("T")[0]}.csv`,
				);
				link.style.visibility = "hidden";

				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);

				toast.success("Leaderboard exported successfully!");
			} catch (error) {
				console.error("Export error:", error);
				toast.error("Failed to export leaderboard");
			}
		},
		[],
	);

	const exportToJSON = useCallback(
		(data: LeaderboardEntry[], filename = "leaderboard") => {
			try {
				const jsonContent = JSON.stringify(data, null, 2);
				const blob = new Blob([jsonContent], {
					type: "application/json;charset=utf-8;",
				});
				const link = document.createElement("a");
				const url = URL.createObjectURL(blob);

				link.setAttribute("href", url);
				link.setAttribute(
					"download",
					`${filename}-${new Date().toISOString().split("T")[0]}.json`,
				);
				link.style.visibility = "hidden";

				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);

				toast.success("Leaderboard exported as JSON!");
			} catch (error) {
				console.error("Export error:", error);
				toast.error("Failed to export leaderboard");
			}
		},
		[],
	);

	return {
		exportToCSV,
		exportToJSON,
	};
}
