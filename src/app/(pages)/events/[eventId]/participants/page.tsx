"use client";

import CSVImportWidget from "@/components/csv-import-widget";
import ExportWidget from "@/components/export-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import {
	ArrowLeft,
	Download,
	Plus,
	Settings,
	Trash2,
	Upload,
} from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateParticipantDialog } from "./_components/create-participant-dialog";
import { DeleteParticipantDialog } from "./_components/delete-participant-dialog";
import { EditParticipantDialog } from "./_components/edit-participant-dialog";

export default function ParticipantsPage() {
	const eventId = useParams().eventId as string;

	const { data: events, isLoading: eventsLoading } =
		api.events.getEvents.useQuery(undefined, {
			refetchInterval: 1000 * 10,
		});
	const {
		data: participants,
		isLoading: participantsLoading,
		refetch: refetchParticipants,
	} = api.participants.getByEvent.useQuery(
		{ eventId },
		{
			enabled: !!eventId,
			refetchInterval: 1000 * 10, // Cache participants for 10 seconds
		},
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

	if (participantsLoading) {
		return <div>Loading participants...</div>;
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
							<p className="text-muted-foreground">Manage participants</p>
						</div>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="font-bold text-3xl">
							Participants ({participants?.length || 0})
						</h2>
						<p className="mt-2 text-muted-foreground">
							Manage quiz participants and their access credentials.
						</p>
					</div>
					<div className="flex gap-2">
						<CSVImportWidget eventId={eventId} />
						<ExportWidget eventId={eventId} eventName={event.title} />
						<CreateParticipantDialog
							eventId={eventId}
							onSuccess={() => refetchParticipants()}
						>
							<Button size="lg">
								<Plus className="mr-2 h-4 w-4" />
								Add Participant
							</Button>
						</CreateParticipantDialog>
					</div>
				</div>

				{!participants || participants.length === 0 ? (
					<div className="py-12 text-center">
						<div className="mx-auto max-w-md">
							<h3 className="mb-2 font-semibold text-xl">
								No participants yet
							</h3>
							<p className="mb-6 text-muted-foreground">
								Add participants manually or import them from a CSV file to get
								started.
							</p>
							<div className="flex justify-center gap-2">
								<CreateParticipantDialog
									eventId={eventId}
									onSuccess={() => refetchParticipants()}
								>
									<Button size="lg">
										<Plus className="mr-2 h-4 w-4" />
										Add First Participant
									</Button>
								</CreateParticipantDialog>
								<CSVImportWidget eventId={eventId} />
							</div>
						</div>
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{participants.map((participant) => (
							<Card key={participant.id}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle className="text-lg">
											{participant.name}
										</CardTitle>
										<Badge
											variant={participant.isActive ? "default" : "secondary"}
										>
											{participant.isActive ? "Active" : "Inactive"}
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<p className="text-muted-foreground text-sm">
										{participant.email}
									</p>
									<div className="mt-4 flex gap-2">
										<EditParticipantDialog
											participant={participant}
											onSuccess={() => refetchParticipants()}
										>
											<Button variant="outline" size="sm">
												<Settings className="mr-2 h-4 w-4" />
												Edit
											</Button>
										</EditParticipantDialog>
										<DeleteParticipantDialog
											participant={participant}
											onSuccess={() => refetchParticipants()}
										>
											<Button variant="outline" size="sm">
												<Trash2 className="mr-2 h-4 w-4" />
												Delete
											</Button>
										</DeleteParticipantDialog>
										<Link
											href={`/events/${eventId}/participants/${participant.id}/answers`}
											className="flex items-center hover:underline"
										>
											<Button
												variant="default"
												size="sm"
												className="flex items-center"
											>
												<Settings className="mr-2 h-4 w-4" />
												View Response
											</Button>
										</Link>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</main>
		</div>
	);
}
