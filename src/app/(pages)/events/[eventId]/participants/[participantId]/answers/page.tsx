"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { DeleteAnswerDialog } from "../../_components/delete-answer-dialog";
import { EditAnswerDialog } from "../../_components/edit-answer-dialog-new";

interface ParticipantAnswersPageProps {
	params: Promise<{
		eventId: string;
		participantId: string;
	}>;
}

function formatTimeTaken(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	const parts = [];
	if (h > 0) parts.push(`${h}h`);
	if (m > 0) parts.push(`${m}m`);
	parts.push(`${s}s`);
	return parts.join(" ");
}

export default function ParticipantAnswersPage({
	params,
}: ParticipantAnswersPageProps) {
	const [eventId, setEventId] = useState<string>("");
	const [participantId, setParticipantId] = useState<string>("");

	useEffect(() => {
		const loadParams = async () => {
			const resolvedParams = await params;
			setEventId(resolvedParams.eventId);
			setParticipantId(resolvedParams.participantId);
		};
		loadParams();
	}, [params]);

	const { data: participant, isLoading: participantLoading } =
		api.participants.getById.useQuery(
			{ id: participantId },
			{
				enabled: !!participantId,
				refetchInterval: 1000 * 10,
			},
		);
	const {
		data: responses,
		isLoading: responsesLoading,
		refetch: refetchResponses,
	} = api.responses.getByParticipant.useQuery(
		{ participantId },
		{
			enabled: !!participantId,
			refetchInterval: 1000 * 10,
		},
	);

	if (!eventId || !participantId) {
		return <div>Loading...</div>;
	}

	if (participantLoading || responsesLoading) {
		return <div>Loading...</div>;
	}

	if (!participant) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-background">
			<header className="border-border border-b bg-card shadow-sm">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center gap-4">
						<Link href={`/events/${eventId}/participants`}>
							<Button variant="ghost" size="sm">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Participants
							</Button>
						</Link>
						<div>
							<h1 className="font-bold text-2xl">
								Answers for {participant.name}
							</h1>
							<p className="text-muted-foreground">
								Review and manage submitted answers and scores.
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				{responses && responses.length > 0 ? (
					<div className="space-y-4">
						{responses.map((response) => (
							<Card key={response.id}>
								<CardHeader>
									<CardTitle className="flex items-center justify-between">
										<span>Question ID: {response.questionId}</span>
										<div className="flex items-center gap-2">
											<Badge
												variant={response.isCorrect ? "default" : "destructive"}
											>
												{response.isCorrect ? "Correct" : "Incorrect"}
											</Badge>
											<div className="flex gap-1">
												<EditAnswerDialog
													answer={response}
													participantId={participantId}
													onSuccess={() => refetchResponses()}
												>
													<Button variant="outline" size="sm">
														<Edit className="mr-1 h-3 w-3" />
														Edit
													</Button>
												</EditAnswerDialog>
												<DeleteAnswerDialog
													answerId={response.id}
													onSuccess={() => refetchResponses()}
												>
													<Button variant="destructive" size="sm">
														<Trash2 className="mr-1 h-3 w-3" />
														Delete
													</Button>
												</DeleteAnswerDialog>
											</div>
										</div>
									</CardTitle>
								</CardHeader>
								<CardContent>
									<p>
										<strong>Submitted Answer:</strong>{" "}
										{response.submittedAnswer}
									</p>
									<p>
										<strong>Points Earned:</strong> {response.pointsEarned}
									</p>
									<p>
										<strong>Time Taken:</strong>{" "}
										{typeof response.timeTaken === "number" &&
										response.timeTaken >= 0
											? formatTimeTaken(response.timeTaken)
											: "N/A"}
									</p>
									<p>
										<strong>Submitted At:</strong>{" "}
										{response.submittedAt
											? format(new Date(response.submittedAt), "PPP p")
											: "N/A"}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				) : (
					<div className="text-center">
						<h2 className="font-semibold text-2xl">No responses found</h2>
						<p className="mt-2 text-muted-foreground">
							This participant has not submitted any answers yet.
						</p>
					</div>
				)}
			</main>
		</div>
	);
}
