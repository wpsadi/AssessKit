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
import type { AppRouter } from "@/server/api/root";
import { api } from "@/trpc/react";
import type { inferRouterOutputs } from "@trpc/server";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Round = RouterOutput["rounds"]["getPublicRounds"][number];

interface EditRoundDialogProps {
	round: Round;
	onSuccess: () => void;
	children: React.ReactNode;
}

export function EditRoundDialog({
	round,
	onSuccess,
	children,
}: EditRoundDialogProps) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [title, setTitle] = useState(round.title);
	const [description, setDescription] = useState(round.description || "");
	const [useEventDuration, setUseEventDuration] = useState(
		round.useEventDuration,
	);
	const [customTimeLimit, setCustomTimeLimit] = useState(round.timeLimit || 60);
	const router = useRouter();

	const { data: events } = api.events.getEvents.useQuery(undefined, {
		refetchInterval: 1000 * 10,
	});
	const event = events?.find((e) => e.id === round.eventId);

	const updateRoundMutation = api.rounds.updateRound.useMutation({
		onSuccess: () => {
			toast.success("Round updated successfully!");
			onSuccess();
			setOpen(false);
			router.refresh();
		},
		onError: (error) => {
			toast.error(`Error updating round: ${error.message}`);
		},
	});

	useEffect(() => {
		if (open) {
			setTitle(round.title);
			setDescription(round.description || "");
			setUseEventDuration(round.useEventDuration);
			setCustomTimeLimit(round.timeLimit || 60);
		}
	}, [open, round]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		try {
			await updateRoundMutation.mutateAsync({
				id: round.id,
				title,
				description,
				timeLimit: useEventDuration ? undefined : customTimeLimit,
				useEventDuration,
			});
		} catch (error) {
			console.error("Error updating round:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const formatTime = (minutes: number) => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m`;
	};

	const effectiveTimeLimit = useEventDuration
		? event?.durationMinutes || 0
		: customTimeLimit;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Edit Round</DialogTitle>
						<DialogDescription>
							Update the round details below.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="title">Round Title</Label>
							<Input
								id="title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Enter round title"
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Enter round description (optional)"
								rows={3}
							/>
						</div>

						{event && (
							<div className="grid gap-4">
								<Label>Time Limit</Label>

								<div className="space-y-4">
									<div className="flex items-center space-x-2">
										<Checkbox
											checked={useEventDuration}
											onCheckedChange={(checked) =>
												setUseEventDuration(Boolean(checked))
											}
										/>
										<Label className="text-sm">
											Use event duration ({formatTime(event.durationMinutes)})
										</Label>
									</div>

									{!useEventDuration && (
										<div className="space-y-2">
											<Label htmlFor="customTimeLimit">
												Custom Time Limit (minutes)
											</Label>
											<Input
												id="customTimeLimit"
												type="number"
												min="1"
												max={event.durationMinutes}
												value={customTimeLimit}
												onChange={(e) =>
													setCustomTimeLimit(Number(e.target.value))
												}
												placeholder="Enter time in minutes"
											/>
											<p className="text-gray-500 text-xs">
												Maximum: {formatTime(event.durationMinutes)} (event
												duration)
											</p>
										</div>
									)}

									<div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
										<p className="text-blue-700 text-sm">
											<strong>Effective Time Limit:</strong>{" "}
											{formatTime(effectiveTimeLimit)}
										</p>
									</div>
								</div>

								{!useEventDuration &&
									customTimeLimit > event.durationMinutes && (
										<Alert variant="destructive">
											<AlertTriangle className="h-4 w-4" />
											<AlertDescription>
												Time limit cannot exceed event duration (
												{formatTime(event.durationMinutes)})
											</AlertDescription>
										</Alert>
									)}
							</div>
						)}
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
								updateRoundMutation.isPending ||
								(!useEventDuration &&
									event &&
									customTimeLimit > event.durationMinutes)
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
