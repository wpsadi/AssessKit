"use client";

// import type React from "react"
// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog"
// import { Alert, AlertDescription } from "@/components/ui/alert"
// import { api } from "@/trpc/react"
// import { AlertTriangle, Trash2 } from "lucide-react"
// import type { Participant } from "@/lib/types"

interface DeleteParticipantDialogProps {
	participant: Participant;
	children: React.ReactNode;
	onSuccess?: () => void;
}



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
import type { Participant } from "@/lib/types";
import { api } from "@/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntityQueries } from "@/lib/query-keys";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface DeleteParticipantDialogProps {
	participant: Participant;
	children: React.ReactNode;
}

export function DeleteParticipantDialog({
	participant,
	children,
}: DeleteParticipantDialogProps) {
	const utils = api.useUtils();
	const toastId = "delete-participant-toast";
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();
	const deleteParticipant = api.participants.delete.useMutation({
		onMutate: () => {
			toast.loading("Deleting participant...", {
				id: toastId,
			});
		},
		onSuccess: (result) => {
			if (result.success) {
				// Use centralized invalidation helper for participants
				utils.participants.getByEvent.invalidate({
					eventId: participant.eventId,
				});
				setOpen(false);
				toast.success("Participant deleted successfully!", {
					id: toastId,
				});
				router.refresh();
			} else {
				toast.error("Failed to delete participant", {
					id: toastId,
				});
				alert(result);
			}
		},
		onError: (error) => {
			console.error("Error deleting participant:", error);
			toast.error(`Error deleting participant: ${error.message}`, {
				id: toastId,
			});
			setOpen(false);
			alert("Failed to delete participant. Please try again.");
		},
	});

	const handleDelete = async () => {
		setIsLoading(true);
		try {
			const result = await deleteParticipant.mutate({
				id: participant.id,
			});
		} catch (error) {
			console.error("Error deleting participant:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild disabled={deleteParticipant.isPending}>
				{children}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-red-600" />
						Delete Participant
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete "{participant.name}"? This action
						cannot be undone and will permanently remove the participant and all
						their quiz responses.
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
						disabled={isLoading}
					>
						{isLoading ? "Deleting..." : "Delete Participant"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
