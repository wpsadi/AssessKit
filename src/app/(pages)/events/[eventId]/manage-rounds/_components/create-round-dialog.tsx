"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { AlertTriangle } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface CreateRoundDialogProps {
	eventId: string;
	children: React.ReactNode;
	onSuccess?: () => void;
}

export function CreateRoundDialog({
	eventId,
	children,
	onSuccess,
}: CreateRoundDialogProps) {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [timeLimit, setTimeLimit] = useState("");
	const [useEventDuration, setUseEventDuration] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");

	const createRoundMutation = api.rounds.createRound.useMutation({
		onSuccess: () => {
			setOpen(false);
			resetForm();
			onSuccess?.();
		},
		onError: (error) => {
			setError(error.message);
			setIsSubmitting(false);
		},
	});

	const resetForm = () => {
		setTitle("");
		setDescription("");
		setTimeLimit("");
		setUseEventDuration(false);
		setError("");
		setIsSubmitting(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError("");

		try {
			await createRoundMutation.mutateAsync({
				eventId,
				title,
				description: description || undefined,
				timeLimit: timeLimit ? Number.parseInt(timeLimit) : undefined,
				useEventDuration,
			});
		} catch (error) {
			// Error is handled by onError callback
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Create New Round</DialogTitle>
					<DialogDescription>
						Add a new round to your quiz event. You can configure timing and add
						questions later.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<div className="space-y-2">
						<Label htmlFor="title">Round Title *</Label>
						<Input
							id="title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g., Round 1: General Knowledge"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description (Optional)</Label>
						<Textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Brief description of this round..."
							rows={3}
						/>
					</div>

					<div className="space-y-4">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="useEventDuration"
								checked={useEventDuration}
								onCheckedChange={(checked) => setUseEventDuration(!!checked)}
							/>
							<Label htmlFor="useEventDuration">
								Use event's default duration
							</Label>
						</div>

						{!useEventDuration && (
							<div className="space-y-2">
								<Label htmlFor="timeLimit">Time Limit (minutes)</Label>
								<Input
									id="timeLimit"
									type="number"
									value={timeLimit}
									onChange={(e) => setTimeLimit(e.target.value)}
									placeholder="30"
									min="1"
								/>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting || !title.trim()}>
							{isSubmitting ? "Creating..." : "Create Round"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
