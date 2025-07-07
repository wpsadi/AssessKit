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
import { api } from "@/trpc/react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface DeleteEventDialogProps {
	event: {
		id: string;
		title: string;
	};
	children: React.ReactNode;
}

export function DeleteEventDialog({ event, children }: DeleteEventDialogProps) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const router = useRouter();

	const deleteEvent = api.events.deleteEvent.useMutation({
		onSuccess: () => {
			toast.success("Event deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["events", "getEvents"] });
			setOpen(false);
			router.refresh();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleDelete = () => {
		deleteEvent.mutate({
			id: event.id,
		});
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-red-600" />
						Delete Event
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete "{event.title}"? This action cannot
						be undone and will permanently delete all rounds, questions, and
						participant data associated with this event.
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
						disabled={deleteEvent.isPending}
					>
						{deleteEvent.isPending ? "Deleting..." : "Delete Event"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
