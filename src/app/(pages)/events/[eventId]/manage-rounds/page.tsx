"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { AlertCircle, ArrowLeft, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateRoundDialog } from "./_components/create-round-dialog";
import { RoundSortableList } from "./_components/round-sortable-list";

interface ManageRoundsPageProps {
	params: Promise<{ eventId: string }>;
}

export default function ManageRoundsPage({ params }: ManageRoundsPageProps) {
	const [eventId, setEventId] = useState<string>("");

	useEffect(() => {
		const resolveParams = async () => {
			const resolved = await params;
			setEventId(resolved.eventId);
		};
		resolveParams();
	}, [params]);

	const { data: events, isLoading: eventsLoading } =
		api.events.getEvents.useQuery(undefined, {
			refetchInterval: 10000,
		});

	const {
		data: rounds,
		isLoading: roundsLoading,
		refetch: refetchRounds,
	} = api.rounds.getPublicRounds.useQuery(
		{ eventId },
		{
			enabled: !!eventId,
			refetchInterval: 10000,
		},
	);

	const event = events?.find((e) => e.id === eventId);

	const totalEventDuration =
		event?.startDate && event.endDate
			? Math.round(
					(new Date(event.endDate).getTime() -
						new Date(event.startDate).getTime()) /
						(1000 * 60),
				)
			: event?.durationMinutes || 0;

	const usedDuration =
		rounds?.reduce((total, round) => {
			return (
				total +
				(round.useEventDuration ? totalEventDuration : round.timeLimit || 0)
			);
		}, 0) || 0;

	const remainingDuration = Math.max(0, totalEventDuration - usedDuration);

	const formatTime = (minutes: number) => {
		if (minutes <= 0) return "0m";
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return h > 0 ? `${h}h ${m}m` : `${m}m`;
	};

	if (!eventId) return <div>Loading...</div>;
	if (eventsLoading) return <div>Loading events...</div>;
	if (!event) return notFound();
	if (roundsLoading) return <div>Loading rounds...</div>;

	return (
		<div className="min-h-screen bg-background">
			<header className="border-border border-b bg-card shadow-sm">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center gap-4">
						<Link href="/dashboard">
							<Button variant="ghost" size="sm">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Dashboard
							</Button>
						</Link>

						<div className="flex-1">
							<h1 className="font-bold text-2xl">{event.title}</h1>
							<p className="text-muted-foreground">
								Manage rounds and questions
							</p>
						</div>

						{totalEventDuration > 0 && (
							<div className="text-right">
								<div className="flex items-center gap-2 text-sm">
									<Clock className="h-4 w-4" />
									<span className="font-medium">
										{formatTime(usedDuration)} /{" "}
										{formatTime(totalEventDuration)} used
									</span>
								</div>
								<p className="text-muted-foreground text-xs">
									{formatTime(remainingDuration)} remaining
								</p>
							</div>
						)}
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				{totalEventDuration === 0 && (
					<Alert className="mb-6">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Warning: This event has no defined duration. Please set start and
							end dates or a duration to enable time limits.
						</AlertDescription>
					</Alert>
				)}

				{totalEventDuration > 0 && usedDuration > totalEventDuration && (
					<Alert variant="destructive" className="mb-6">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							You have exceeded the total event duration by{" "}
							{formatTime(usedDuration - totalEventDuration)}. Adjust your
							rounds or extend the event duration.
						</AlertDescription>
					</Alert>
				)}

				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="font-bold text-3xl">Rounds</h2>
						<p className="mt-2 text-muted-foreground">
							Create and organize quiz rounds. Drag and drop to reorder.
						</p>
						{totalEventDuration > 0 && (
							<p className="mt-1 text-muted-foreground text-sm">
								Each round must use between 1 and{" "}
								{formatTime(Math.max(1, remainingDuration))}.
							</p>
						)}
					</div>

					<CreateRoundDialog
						eventId={eventId}
						onSuccess={refetchRounds}
						totalEventDuration={totalEventDuration}
					>
						<Button
							size="lg"
							disabled={totalEventDuration > 0 && remainingDuration <= 0}
						>
							<Plus className="mr-2 h-4 w-4" />
							Create Round
						</Button>
					</CreateRoundDialog>
				</div>

				{!rounds || rounds.length === 0 ? (
					<div className="py-12 text-center">
						<div className="mx-auto max-w-md">
							<h3 className="mb-2 font-semibold text-xl">No rounds yet</h3>
							<p className="mb-6 text-muted-foreground">
								Create your first round to start adding questions and managing
								the quiz.
							</p>
							<CreateRoundDialog
								eventId={eventId}
								onSuccess={refetchRounds}
								totalEventDuration={totalEventDuration}
							>
								<Button
									size="lg"
									disabled={totalEventDuration > 0 && remainingDuration <= 0}
								>
									<Plus className="mr-2 h-4 w-4" />
									Create Your First Round
								</Button>
							</CreateRoundDialog>
						</div>
					</div>
				) : (
					<RoundSortableList
						rounds={rounds}
						onUpdate={refetchRounds}
						eventId={eventId}
						totalEventDuration={totalEventDuration}
						usedDuration={usedDuration}
						remainingDuration={remainingDuration}
					/>
				)}
			</main>
		</div>
	);
}
