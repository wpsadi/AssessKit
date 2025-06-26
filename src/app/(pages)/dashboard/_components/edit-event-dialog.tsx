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
import { useState } from "react";

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
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const updateEvent = api.events.updateEvent.useMutation({});

	const handleSubmit = async (formData: FormData) => {
		setIsLoading(true);
		try {
			const result = await updateEvent.mutateAsync({
				id: event.id,
				title: formData.get("title") as string,
				description: formData.get("description") as string,
				startDate: formData.get("startDate")
					? new Date(formData.get("startDate") as string)
					: undefined,
				endDate: formData.get("endDate")
					? new Date(formData.get("endDate") as string)
					: undefined,
			});
			setOpen(false);
			router.refresh();
		} catch (error) {
			console.error("Error updating event:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const formatDateForInput = (dateString: string | null) => {
		if (!dateString) return "";
		return new Date(dateString).toISOString().slice(0, 16);
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
									defaultValue={formatDateForInput(event.start_date)}
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="endDate">End Date</Label>
								<Input
									id="endDate"
									name="endDate"
									type="datetime-local"
									defaultValue={formatDateForInput(event.end_date)}
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
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Updating..." : "Update Event"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
