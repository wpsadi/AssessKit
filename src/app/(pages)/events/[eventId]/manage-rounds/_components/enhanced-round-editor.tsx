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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	AlertTriangle,
	Clock,
	Edit,
	GripVertical,
	Info,
	Save,
	Settings,
	Trash2,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { Event, Round } from "@/lib/types";
import { api } from "@/trpc/react";
import { DeleteRoundDialog } from "./delete-round-dialog";

interface Props {
	round: Round;
	event: Event;
}

export function EnhancedRoundEditor({ round, event }: Props) {
	const router = useRouter();
	const updateRound = api.rounds.updateRound.useMutation();

	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const defaultTimeLimit = 60;

	const [title, setTitle] = useState(round.title);
	const [description, setDescription] = useState(round.description || "");
	const [useEventDuration, setUseEventDuration] = useState(
		round.useEventDuration || false,
	);
	const [customTimeLimit, setCustomTimeLimit] = useState(
		round.timeLimit ?? defaultTimeLimit,
	);

	const effectiveTimeLimit = useEventDuration
		? event.durationMinutes
		: customTimeLimit;

	const formatTime = (min: number) =>
		min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`;

	const handleSave = async () => {
		setIsLoading(true);
		try {
			await updateRound.mutateAsync({
				id: round.id,
				title,
				description,
				useEventDuration: useEventDuration,
				timeLimit: useEventDuration ? undefined : customTimeLimit,
			});

			toast.success("Round updated successfully");
			setIsEditing(false);
			router.refresh();
		} catch (err) {
			toast.error("Failed to update round", {
				description: (err as Error).message,
			});
		} finally {
			setIsLoading(false);
		}
	};

	const renderPreview = () => (
		<Card className="transition-shadow hover:shadow-md">
			<CardHeader>
				<div className="flex items-start gap-4">
					<GripVertical className="mt-1 h-5 w-5 text-muted-foreground" />
					<div className="flex-1 space-y-1">
						<CardTitle className="text-xl">
							Round {round.orderIndex}: {title}
						</CardTitle>
						<p className="text-muted-foreground">
							{description || "No description provided"}
						</p>
					</div>
					<div className="flex gap-2">
						<Badge variant={round.isActive ? "default" : "secondary"}>
							{round.isActive ? "Active" : "Inactive"}
						</Badge>
						{useEventDuration && (
							<Badge variant="outline" className="text-blue-600">
								Full Event
							</Badge>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-2 text-muted-foreground text-sm">
					<Clock className="h-4 w-4" />
					<span>
						{useEventDuration
							? `${formatTime(event.durationMinutes || 60)} (Full Event)`
							: `${formatTime(customTimeLimit)}`}
					</span>
				</div>
			</CardContent>
			<CardFooter className="flex justify-between">
				<Link href={`/events/${event.id}/rounds/${round.id}/questions`}>
					<Button variant="outline">
						<Settings className="mr-2 h-4 w-4" />
						Manage Questions
					</Button>
				</Link>
				<div className="flex gap-2">
					<Button size="sm" onClick={() => setIsEditing(true)}>
						<Edit className="mr-1 h-4 w-4" />
						Edit
					</Button>
					<DeleteRoundDialog round={round}>
						<Button variant="ghost" size="sm" className="text-destructive">
							<Trash2 className="h-4 w-4" />
						</Button>
					</DeleteRoundDialog>
				</div>
			</CardFooter>
		</Card>
	);

	const renderEditor = () => (
		<Card className="border-blue-200 shadow-sm">
			<CardHeader>
				<CardTitle className="text-lg">
					Editing Round {round.orderIndex}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<Alert>
					<Info className="h-4 w-4" />
					<AlertDescription>
						Event Duration: {formatTime(event.durationMinutes || 60)}
					</AlertDescription>
				</Alert>

				<div className="grid gap-2">
					<Label>Round Title</Label>
					<Input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						required
					/>
				</div>

				<div className="grid gap-2">
					<Label>Description</Label>
					<Textarea
						rows={3}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Optional description"
					/>
				</div>

				<div className="space-y-4">
					<Label>Time Limit</Label>
					<div className="flex items-center space-x-2">
						<Switch
							checked={useEventDuration}
							onCheckedChange={(val) => setUseEventDuration(Boolean(val))}
						/>
						<span className="text-muted-foreground text-sm">
							Use full event duration
						</span>
					</div>

					{!useEventDuration && (
						<div className="space-y-1">
							<Input
								type="number"
								min={1}
								max={event.durationMinutes || 60}
								value={customTimeLimit}
								onChange={(e) =>
									setCustomTimeLimit(Math.max(1, Number(e.target.value)))
								}
							/>
							<p className="text-muted-foreground text-xs">
								Max: {formatTime(event.durationMinutes || 60)}
							</p>
						</div>
					)}

					{!useEventDuration &&
						customTimeLimit > (event.durationMinutes || 60) && (
							<Alert variant="destructive">
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									Time limit cannot exceed event duration (
									{formatTime(event.durationMinutes || 60)})
								</AlertDescription>
							</Alert>
						)}
				</div>
			</CardContent>
			<CardFooter className="flex justify-between">
				<Button
					type="button"
					variant="outline"
					onClick={() => setIsEditing(false)}
					disabled={isLoading}
				>
					<X className="mr-2 h-4 w-4" /> Cancel
				</Button>
				<Button
					onClick={handleSave}
					disabled={
						isLoading ||
						(!useEventDuration &&
							(customTimeLimit < 1 ||
								customTimeLimit > (event.durationMinutes ?? 60)))
					}
				>
					<Save className="mr-2 h-4 w-4" />
					{isLoading ? "Saving..." : "Save Changes"}
				</Button>
			</CardFooter>
		</Card>
	);

	return isEditing ? renderEditor() : renderPreview();
}
// This component allows editing of a quiz round with options for title, description, time limits, and more.
