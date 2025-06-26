"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Event, Round } from "@/lib/types";
import { api } from "@/trpc/react";
import {
	AlertTriangle,
	Clock,
	Edit,
	GripVertical,
	Save,
	Settings,
	Trash2,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteRoundDialog } from "./delete-round-dialog";

interface SimpleRoundEditorProps {
	round: Round;
	event: Event;
}

export function SimpleRoundEditor({ round, event }: SimpleRoundEditorProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [useEventDuration, setUseEventDuration] = useState(
		round.useEventDuration,
	);
	const [title, setTitle] = useState(round.title);
	const [description, setDescription] = useState(round.description || "");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");

	const router = useRouter();

	const updateRound = api.rounds.updateRound.useMutation({
		onSuccess: () => {
			setIsEditing(false);
			router.refresh();
		},
		onError: (error) => {
			console.error("Error updating round:", error);
		},
	});

	const formatTime = (minutes: number) => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m`;
	};

	const getEventDurationMinutes = () => {
		if (!event.endDate || !event.startDate) {
			return 0;
		}
		const startTime = new Date(event.startDate).getTime();
		const endTime = new Date(event.endDate).getTime();
		return Math.max(0, Math.floor((endTime - startTime) / 60000));
	};

	const eventDuration = getEventDurationMinutes();

	const derivedTimeLimit =
		startTime && endTime
			? Math.max(
					0,
					Math.floor(
						(new Date(endTime).getTime() - new Date(startTime).getTime()) /
							60000,
					),
				)
			: eventDuration;

	const effectiveTimeLimit = useEventDuration
		? eventDuration
		: derivedTimeLimit;

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			await updateRound.mutateAsync({
				id: round.id,
				title,
				description,
				useEventDuration,
				timeLimit: useEventDuration ? undefined : derivedTimeLimit,
			});
		} catch (error) {
			console.error("Error updating round:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const renderRoundPreview = () => (
		<Card className="transition-shadow hover:shadow-md">
			<CardHeader>
				<div className="flex items-start gap-4">
					<GripVertical className="mt-1 h-5 w-5 flex-shrink-0 text-gray-400" />
					<div className="flex-1">
						<div className="flex items-start justify-between">
							<div>
								<CardTitle className="text-xl">
									Round {round.orderIndex}: {round.title}
								</CardTitle>
								<p className="mt-1 text-gray-600">
									{round.description || "No description provided"}
								</p>
							</div>
							<div className="flex gap-2">
								<Badge variant={round.isActive ? "default" : "secondary"}>
									{round.isActive ? "Active" : "Inactive"}
								</Badge>
								{round.useEventDuration && (
									<Badge variant="outline" className="text-blue-600">
										Event Duration
									</Badge>
								)}
							</div>
						</div>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				<div className="flex items-center gap-6 text-gray-600 text-sm">
					<div className="flex items-center gap-1">
						<Clock className="h-4 w-4" />
						<span>
							{round.useEventDuration
								? `${formatTime(eventDuration)} (Event Duration)`
								: `${formatTime(round.timeLimit || eventDuration)}`}
						</span>
					</div>
				</div>
			</CardContent>

			<CardFooter className="flex justify-between">
				<Link href={`/rounds/${round.id}/questions`}>
					<Button variant="outline">
						<Settings className="mr-2 h-4 w-4" />
						Manage Questions
					</Button>
				</Link>

				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsEditing(true)}
					>
						<Edit className="mr-2 h-4 w-4" />
						Edit
					</Button>

					<DeleteRoundDialog round={round}>
						<Button
							variant="ghost"
							size="sm"
							className="text-red-600 hover:text-red-700"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</DeleteRoundDialog>
				</div>
			</CardFooter>
		</Card>
	);

	const renderRoundEditor = () => (
		<Card className="border-blue-200 shadow-md">
			<form onSubmit={handleSave}>
				<CardHeader>
					<div className="flex items-start gap-4">
						<GripVertical className="mt-1 h-5 w-5 flex-shrink-0 text-gray-400" />
						<div className="flex-1">
							<CardTitle className="mb-4 text-lg">
								Editing Round {round.orderIndex}
							</CardTitle>

							<div className="grid gap-6">
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

								<div className="grid gap-4">
									<Label>Time Limit</Label>

									<div className="space-y-4">
										<div className="flex items-center space-x-2">
											<Checkbox
												id="useEventDuration"
												checked={useEventDuration}
												onCheckedChange={(checked) =>
													setUseEventDuration(checked === true)
												}
											/>
											<Label htmlFor="useEventDuration" className="text-sm">
												Use event duration ({formatTime(eventDuration)})
											</Label>
										</div>

										{!useEventDuration && (
											<div className="space-y-2">
												<Label htmlFor="startTime">Start Time</Label>
												<Input
													id="startTime"
													type="datetime-local"
													value={startTime}
													onChange={(e) => setStartTime(e.target.value)}
												/>

												<Label htmlFor="endTime">End Time</Label>
												<Input
													id="endTime"
													type="datetime-local"
													value={endTime}
													onChange={(e) => setEndTime(e.target.value)}
												/>

												<p className="text-gray-500 text-xs">
													Calculated duration:{" "}
													{derivedTimeLimit > 0
														? `${formatTime(derivedTimeLimit)}`
														: "N/A"}
												</p>
											</div>
										)}

										<div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
											<p className="text-blue-700 text-sm">
												<strong>Effective Time Limit:</strong>{" "}
												{formatTime(effectiveTimeLimit)}
											</p>
										</div>

										{!useEventDuration &&
											(derivedTimeLimit <= 0 ||
												derivedTimeLimit > eventDuration) && (
												<Alert variant="destructive">
													<AlertTriangle className="h-4 w-4" />
													<AlertDescription>
														Time must be positive and not exceed event duration
														({formatTime(eventDuration)})
													</AlertDescription>
												</Alert>
											)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</CardHeader>

				<CardFooter className="flex justify-between">
					<Button
						type="button"
						variant="outline"
						onClick={() => setIsEditing(false)}
						disabled={isLoading}
					>
						<X className="mr-2 h-4 w-4" />
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={
							isLoading ||
							(!useEventDuration &&
								(!startTime ||
									!endTime ||
									derivedTimeLimit <= 0 ||
									derivedTimeLimit > eventDuration))
						}
					>
						<Save className="mr-2 h-4 w-4" />
						{isLoading ? "Saving..." : "Save Changes"}
					</Button>
				</CardFooter>
			</form>
		</Card>
	);

	return isEditing ? renderRoundEditor() : renderRoundPreview();
}
