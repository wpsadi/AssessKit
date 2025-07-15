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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";

interface CreateEventDialogProps {
	children: React.ReactNode;
}

export function CreateEventDialog({ children }: CreateEventDialogProps) {
	const utils = api.useUtils();;
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const toastId = useId();

	const createEvent = api.events.createEvent.useMutation({
		mutationKey: ["events", "createEvent"],
		onMutate: () => {
			toast.loading("Creating event...", { id: toastId });
		},
		onSuccess: (data) => {
			toast.success("Event created successfully!", { id: toastId });
			// Use centralized invalidation helper for events
			utils.events.getEvents.invalidate();
			setOpen(false);
			router.refresh();
		},
		onError: (error) => {
			toast.error(`Failed to create event: ${error.message}`, { id: toastId });
		},
	});

	const handleSubmit = async (formData: FormData) => {
		const startDateStr = formData.get("startDate") as string;
		const endDateStr = formData.get("endDate") as string;

		// Validation: start date should not be after end date
		if (startDateStr && endDateStr) {
			const start = new Date(startDateStr);
			const end = new Date(endDateStr);
			if (start > end) {
				toast.error("Start date/time cannot be after end date/time.", {
					id: toastId,
				});
				return;
			}
		}

		const eventData = {
			title: formData.get("title") as string,
			description: formData.get("description") as string,
			...(startDateStr && { startDate: new Date(startDateStr) }),
			...(endDateStr && { endDate: new Date(endDateStr) }),
		};

		createEvent.mutate(eventData);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<form action={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Create New Event</DialogTitle>
						<DialogDescription>
							Create a new quiz event. You can add rounds and questions after
							creating the event.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="title">Event Title</Label>
							<Input
								id="title"
								name="title"
								placeholder="Enter event title"
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								name="description"
								placeholder="Enter event description (optional)"
								rows={3}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="startDate">Start Date</Label>
								<Input id="startDate" name="startDate" type="datetime-local" />
							</div>

							<div className="grid gap-2">
								<Label htmlFor="endDate">End Date</Label>
								<Input id="endDate" name="endDate" type="datetime-local" />
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={createEvent.isPending}>
							{createEvent.isPending ? "Creating..." : "Create Event"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
