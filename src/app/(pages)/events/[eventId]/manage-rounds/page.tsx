"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { ArrowLeft, Plus } from "lucide-react";
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
		// Handle the async params
		const loadParams = async () => {
			const resolvedParams = await params;
			setEventId(resolvedParams.eventId);
		};
		loadParams();
	}, [params]);

	const { data: events, isLoading: eventsLoading } =
		api.events.getEvents.useQuery(undefined, {
			refetchInterval: 1000 * 10,
		});
	const {
		data: rounds,
		isLoading: roundsLoading,
		refetch: refetchRounds,
	} = api.rounds.getPublicRounds.useQuery(
		{ eventId },
		{ enabled: !!eventId, refetchInterval: 1000 * 10 },
	);

	const event = events?.find((e) => e.id === eventId);

	if (!eventId) {
		return <div>Loading...</div>;
	}

	if (eventsLoading) {
		return <div>Loading events...</div>;
	}

	if (!event) {
		notFound();
	}

	if (roundsLoading) {
		return <div>Loading rounds...</div>;
	}

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
						<div>
							<h1 className="font-bold text-2xl">{event.title}</h1>
							<p className="text-muted-foreground">
								Manage rounds and questions
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="font-bold text-3xl">Rounds</h2>
						<p className="mt-2 text-muted-foreground">
							Create and organize quiz rounds. Drag and drop to reorder.
						</p>
					</div>
					<CreateRoundDialog
						eventId={eventId}
						onSuccess={() => refetchRounds()}
					>
						<Button size="lg">
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
								Create your first round to start adding questions and organizing
								your quiz.
							</p>
							<CreateRoundDialog
								eventId={eventId}
								onSuccess={() => refetchRounds()}
							>
								<Button size="lg">
									<Plus className="mr-2 h-4 w-4" />
									Create Your First Round
								</Button>
							</CreateRoundDialog>
						</div>
					</div>
				) : (
					<RoundSortableList
						rounds={rounds}
						onUpdate={() => refetchRounds()}
						eventId={eventId}
					/>
				)}
			</main>
		</div>
	);
}
