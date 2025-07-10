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
import { invalidateEntityQueries, queryKeys } from "@/lib/query-keys";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Round {
	id: string;
	title: string;
	description: string | null;
	timeLimit: number | null;
	useEventDuration: boolean;
	eventId: string;
	orderIndex: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

interface EditRoundDialogProps {
	round: Round;
	onSuccess: () => void;
	children: React.ReactNode;
	totalEventDuration: number;
}

export function EditRoundDialog({
	round,
	children,
	onSuccess,
	totalEventDuration,
}: EditRoundDialogProps) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [title, setTitle] = useState(round.title);
	const [description, setDescription] = useState(round.description || "");
	const [useEventDuration, setUseEventDuration] = useState(
		round.useEventDuration,
	);
	const [customTimeLimit, setCustomTimeLimit] = useState(round.timeLimit || 30);
	const [errors, setErrors] = useState<{ title?: string; timeLimit?: string }>(
		{},
	);

	const router = useRouter();
	const queryClient = useQueryClient();

	const allRounds = api.rounds.getPublicRounds.useQuery(
		{ eventId: round.eventId },
		{
			enabled: !!round.eventId,
			queryHash: `getPublicRounds-${round.eventId}`,
		},
	);

	const updateRoundMutation = api.rounds.updateRound.useMutation({
		onSuccess: () => {
			toast.success("Round updated successfully");
			// Invalidate relevant queries for smooth UI updates
			queryClient.invalidateQueries({
				queryKey: ["rounds", "getPublicRounds", round.eventId],
			});
			queryClient.invalidateQueries({
				queryKey: ["rounds", "getRound"],
			});
			onSuccess();
			setOpen(false);
			router.refresh();
		},
		onError: (error) => {
			console.error("Error updating round:", error);
			toast.error(error.message || "Failed to update round");
		},
	});

	useEffect(() => {
		if (open) {
			setTitle(round.title);
			setDescription(round.description || "");
			setUseEventDuration(round.useEventDuration);
			setCustomTimeLimit(round.timeLimit || 30);
			setErrors({});
		}
	}, [open, round]);

	// Remove cumulative sum/remaining time logic for useEventDuration
	const otherRoundsDuration =
		allRounds.data?.reduce((sum, r) => {
			if (r.id === round.id) return sum;
			if (r.useEventDuration) return sum; // Don't sum event duration for rounds using event duration
			return sum + (r.timeLimit || 0);
		}, 0) || 0;

	const proposedDuration = useEventDuration
		? totalEventDuration
		: customTimeLimit;
	const totalAfterEdit = proposedDuration + otherRoundsDuration;
	const maxAvailable = totalEventDuration - otherRoundsDuration;
	const limitExceeded =
		!useEventDuration && totalAfterEdit > totalEventDuration;

	const validateForm = () => {
		const newErrors: { title?: string; timeLimit?: string } = {};

		if (!title.trim()) {
			newErrors.title = "Title is required";
		}

		if (!useEventDuration) {
			if (customTimeLimit < 1) {
				newErrors.timeLimit = "Duration must be at least 1 minute";
			} else if (limitExceeded) {
				newErrors.timeLimit = `You can use at most ${maxAvailable} minute(s)`;
			}
		}
		// No else: allow multiple useEventDuration rounds
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		setIsLoading(true);
		try {
			await updateRoundMutation.mutateAsync({
				id: round.id,
				title: title.trim(),
				description: description.trim() || undefined,
				timeLimit: useEventDuration ? undefined : customTimeLimit,
				useEventDuration,
			});
		} catch {
			// error already handled
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Edit Round</DialogTitle>
					<DialogDescription>Update the round details below.</DialogDescription>
				</DialogHeader>

				{totalEventDuration > 0 && (
					<div className="mb-4 text-muted-foreground text-sm">
						<p>Total event duration: {totalEventDuration} min</p>
						<p>Other rounds total: {otherRoundsDuration} min</p>
						<p>Max allowed for this round: {maxAvailable} min</p>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="title">Round Title *</Label>
						<Input
							id="title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className={errors.title ? "border-destructive" : ""}
						/>
						{errors.title && (
							<p className="text-destructive text-sm">{errors.title}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description (optional)</Label>
						<Textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
						/>
					</div>

					<div className="space-y-2">
						<Label>Duration</Label>
						<div className="flex items-center space-x-2">
							<Checkbox
								checked={useEventDuration}
								onCheckedChange={(checked) => setUseEventDuration(!!checked)}
							/>
							<Label className="text-sm">
								Use full event duration ({totalEventDuration} min)
							</Label>
						</div>

						{!useEventDuration && (
							<div className="space-y-2">
								<Label htmlFor="customTimeLimit">
									Time limit (minutes) *
									{maxAvailable > 0 && (
										<span className="ml-2 text-muted-foreground text-xs">
											(Max: {maxAvailable} min)
										</span>
									)}
								</Label>
								<Input
									id="customTimeLimit"
									type="number"
									min={1}
									max={maxAvailable}
									value={customTimeLimit}
									onChange={(e) => setCustomTimeLimit(Number(e.target.value))}
									className={errors.timeLimit ? "border-destructive" : ""}
								/>
								{errors.timeLimit && (
									<p className="text-destructive text-sm">{errors.timeLimit}</p>
								)}
							</div>
						)}
					</div>

					{limitExceeded && (
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>
								This round exceeds the total event time limit.
							</AlertDescription>
						</Alert>
					)}

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
								updateRoundMutation.isPending ||
								(!useEventDuration && limitExceeded)
							}
						>
							{isLoading || updateRoundMutation.isPending
								? "Updating..."
								: "Update Round"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
