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
import { useState } from "react";
import { toast } from "sonner";

interface CreateRoundDialogProps {
	eventId: string;
	totalEventDuration: number;
	children: React.ReactNode;
	onSuccess?: () => void;
}

export function CreateRoundDialog({
	eventId,
	totalEventDuration,
	children,
	onSuccess,
}: CreateRoundDialogProps) {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [timeLimit, setTimeLimit] = useState("30");
	const [useEventDuration, setUseEventDuration] = useState(false);
	const [errors, setErrors] = useState<{ title?: string; timeLimit?: string }>(
		{},
	);

	const eventInfo = api.events.getEvent.useQuery(
		{ id: eventId },
		{ enabled: !!eventId },
	);
	const rounds = api.rounds.getPublicRounds.useQuery(
		{ eventId },
		{ enabled: !!eventId },
	);

	// Remove cumulative sum/remaining time logic for useEventDuration
	const actualUsedDuration =
		rounds.data?.reduce((sum, round) => {
			if (round.useEventDuration) {
				return sum; // Don't sum event duration for rounds using event duration
			}
			return sum + (round.timeLimit || 0);
		}, 0) || 0;

	const remainingDuration = totalEventDuration - actualUsedDuration;

	const createRoundMutation = api.rounds.createRound.useMutation({
		onSuccess: () => {
			toast.success("Round created successfully");
			setOpen(false);
			resetForm();
			onSuccess?.();
		},
		onError: (error) => {
			console.error("Error creating round:", error);
			toast.error(error.message || "Failed to create round");
		},
	});

	const resetForm = () => {
		setTitle("");
		setDescription("");
		setTimeLimit("30");
		setUseEventDuration(false);
		setErrors({});
	};

	const formatTime = (minutes: number) => `${minutes}m`;

	const validateForm = () => {
		const newErrors: { title?: string; timeLimit?: string } = {};

		if (!title.trim()) {
			newErrors.title = "Title is required";
		}

		if (!useEventDuration) {
			const timeLimitNum = Number.parseInt(timeLimit);
			if (!timeLimit.trim()) {
				newErrors.timeLimit = "Duration is required";
			} else if (Number.isNaN(timeLimitNum)) {
				newErrors.timeLimit = "Duration must be a valid number";
			} else if (timeLimitNum < 1) {
				newErrors.timeLimit = "Duration must be at least 1 minute";
			} else if (timeLimitNum > remainingDuration) {
				newErrors.timeLimit = `Duration cannot exceed ${formatTime(remainingDuration)} (remaining time)`;
			}
		}
		// No else: allow multiple useEventDuration rounds
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) return;

		try {
			await createRoundMutation.mutateAsync({
				eventId,
				title: title.trim(),
				description: description.trim() || undefined,
				timeLimit: useEventDuration ? undefined : Number.parseInt(timeLimit),
				useEventDuration,
			});
		} catch (error) {
			// handled by onError
		}
	};

	const effectiveDuration = useEventDuration
		? totalEventDuration
		: Number.parseInt(timeLimit) || 0;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Create New Round</DialogTitle>
					<DialogDescription>
						Add a new round to your quiz event.
					</DialogDescription>
				</DialogHeader>

				{/* Event Info */}
				{eventInfo.data && (
					<div className="mb-4 text-muted-foreground text-sm">
						<p>
							<strong>Event:</strong> {eventInfo.data.title}
						</p>
						<p>
							<strong>Rounds:</strong> {eventInfo.data.roundCount}
						</p>
						<p>
							<strong>Participants:</strong> {eventInfo.data.participantCount}
						</p>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="title">Round Title *</Label>
						<Input
							id="title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g., Round 1: General Knowledge"
							className={errors.title ? "border-destructive" : ""}
						/>
						{errors.title && (
							<p className="text-destructive text-sm">{errors.title}</p>
						)}
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
						<Label>Duration</Label>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="useEventDuration"
								checked={useEventDuration}
								onCheckedChange={(checked) => setUseEventDuration(!!checked)}
							/>
							<Label htmlFor="useEventDuration" className="text-sm">
								Use full event duration
								{totalEventDuration > 0 &&
									` (${formatTime(totalEventDuration)})`}
							</Label>
						</div>

						{!useEventDuration && (
							<div className="space-y-2">
								<Label htmlFor="timeLimit">
									Duration (minutes) *
									{remainingDuration > 0 && (
										<span className="ml-2 text-muted-foreground text-xs">
											(Max: {formatTime(remainingDuration)})
										</span>
									)}
								</Label>
								<Input
									id="timeLimit"
									type="number"
									min="1"
									max={remainingDuration}
									value={timeLimit}
									onChange={(e) => setTimeLimit(e.target.value)}
									placeholder="30"
									className={errors.timeLimit ? "border-destructive" : ""}
								/>
								{errors.timeLimit && (
									<p className="text-destructive text-sm">{errors.timeLimit}</p>
								)}
							</div>
						)}

						{effectiveDuration > 0 && (
							<div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
								<p className="text-blue-700 text-sm">
									<strong>Effective Duration:</strong>{" "}
									{formatTime(effectiveDuration)}
								</p>
							</div>
						)}

						{totalEventDuration === 0 && (
							<p className="text-muted-foreground text-xs">
								No event duration limit set. Duration must be at least 1 minute.
							</p>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setOpen(false);
								resetForm();
							}}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={
								createRoundMutation.isPending ||
								(!useEventDuration && totalEventDuration > 0 && remainingDuration <= 0)
							}
						>
							{createRoundMutation.isPending ? "Creating..." : "Create Round"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
