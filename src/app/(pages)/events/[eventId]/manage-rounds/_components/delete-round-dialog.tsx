"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import type { Round } from "@/lib/types";
import { api } from "@/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntityQueries } from "@/lib/query-keys";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
interface DeleteRoundDialogProps {
	round: Round;
	children: React.ReactNode;
}

export function DeleteRoundDialog({ round, children }: DeleteRoundDialogProps) {
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const queryClient = useQueryClient();

	const deleteRound = api.rounds.deleteRound.useMutation({
		onSuccess: (result) => {
			if (result.success) {
				// Use centralized invalidation helper for rounds
				invalidateEntityQueries.rounds(queryClient, round.eventId, round.id);
				setOpen(false);
				router.refresh();
				// Add success toast
				toast.success("Round deleted successfully");
			} else {
				toast.error("Failed to delete round");
			}
		},
		onError: (error) => {
			console.error("Error deleting round:", error);
			toast.error(error.message || "Failed to delete round");
		},
	});

	const handleDelete = () => {
		deleteRound.mutate({
			id: round.id,
		});
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-red-600" />
						Delete Round
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete "{round.title}"? This action cannot
						be undone and will permanently delete all questions associated with
						this round.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={handleDelete}
						disabled={deleteRound.isPending}
					>
						{deleteRound.isPending ? "Deleting..." : "Delete Round"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
