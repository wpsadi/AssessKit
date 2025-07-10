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
import { invalidateEntityQueries } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface EditEventDialogProps {
	event: {
		id: string;
		title: string;
		description?: string | null;
		start_date: string;
		end_date: string;
	};
	children: React.ReactNode;
}

export function EditEventDialog({ event, children }: EditEventDialogProps) {
	const formatDateForInput = (dateString: string | null) => {
		if (!dateString) return "";
		return new Date(dateString).toISOString().slice(0, 16);
	};

	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [startDate, setStartDate] = useState(
		formatDateForInput(event.start_date),
	);
	const [endDate, setEndDate] = useState(formatDateForInput(event.end_date));
	const router = useRouter();

	const updateEvent = api.events.updateEvent.useMutation({
		onSuccess: () => {
			toast.success("Event updated successfully");
			// Use centralized invalidation helper for events
			invalidateEntityQueries.events(queryClient, event.id);
			setOpen(false);
			router.refresh();
		},
	});

	const handleSubmit = async (formData: FormData) => {
		setIsLoading(true);
		try {
			const startDateTime = formData.get("startDate") as string;
			const endDateTime = formData.get("endDate") as string;

			// Validate that start date is before end date
			if (
				startDateTime &&
				endDateTime &&
				new Date(startDateTime) >= new Date(endDateTime)
			) {
				toast.error("Start time must be before end time");
				setIsLoading(false);
				return;
			}

			const result = await updateEvent.mutateAsync({
				id: event.id,
				title: formData.get("title") as string,
				description: formData.get("description") as string,
				startDate: startDateTime ? new Date(startDateTime) : undefined,
				endDate: endDateTime ? new Date(endDateTime) : undefined,
			});

			toast.success("Event updated successfully");
			setOpen(false);
			router.refresh();
		} catch (error) {
			console.error("Error updating event:", error);
			toast.error("Failed to update event");
		} finally {
			setIsLoading(false);
		}
	};

	const handleStartDateChange = (value: string) => {
		setStartDate(value);
		if (endDate && value && new Date(value) >= new Date(endDate)) {
			toast.error("Start time must be before end time");
		}
	};

	const handleEndDateChange = (value: string) => {
		setEndDate(value);
		if (startDate && value && new Date(startDate) >= new Date(value)) {
			toast.error("End time must be after start time");
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<form action={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Edit Event</DialogTitle>
						<DialogDescription>
							Update the event details below.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="title">Event Title</Label>
							<Input
								id="title"
								name="title"
								defaultValue={event.title}
								placeholder="Enter event title"
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								name="description"
								defaultValue={event.description || ""}
								placeholder="Enter event description (optional)"
								rows={3}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="startDate">Start Date</Label>
								<Input
									id="startDate"
									name="startDate"
									type="datetime-local"
									value={startDate}
									onChange={(e) => handleStartDateChange(e.target.value)}
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="endDate">End Date</Label>
								<Input
									id="endDate"
									name="endDate"
									type="datetime-local"
									value={endDate}
									onChange={(e) => handleEndDateChange(e.target.value)}
								/>
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
						<Button
							type="submit"
							disabled={
								isLoading ||
								(typeof startDate === "string" &&
									typeof endDate === "string" &&
									startDate !== "" &&
									endDate !== "" &&
									new Date(startDate) >= new Date(endDate))
							}
						>
							{isLoading ? "Updating..." : "Update Event"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
