"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { AlertCircle, ArrowLeft, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SimpleCreateQuestionDialog } from "./_components/simple-create-question-dialog";
import { SimpleQuestionEditorList } from "./_components/simple-question-editor-list";

interface QuestionsPageProps {
	params: Promise<{ roundId: string }>;
}

export default function QuestionsPage({ params }: QuestionsPageProps) {
	const [roundId, setRoundId] = useState<string>("");

	useEffect(() => {
		const loadParams = async () => {
			const resolvedParams = await params;
			setRoundId(resolvedParams.roundId);
		};
		loadParams();
	}, [params]);

	const {
		data: round,
		isLoading: roundLoading,
		error: roundError,
	} = api.rounds.getRound.useQuery(
		{ id: roundId },
		{ enabled: !!roundId, refetchInterval: 1000 * 10, retry: 0 },
	);

	const {
		data: questions,
		isLoading: questionsLoading,
		error: questionsError,
		refetch: refetchQuestions,
	} = api.questions.getByRound.useQuery(
		{ roundId },
		{ enabled: !!roundId, refetchInterval: 1000 * 5, retry: 0 },
	);

	const {
		data: event,
		isLoading: eventLoading,
		error: eventError,
	} = api.events.getEvent.useQuery(
		{ id: round?.eventId || "" },
		{ enabled: !!round?.eventId, refetchInterval: 1000 * 10, retry: 0 },
	);

	if (!roundId) {
		return (
			<div className="min-h-screen bg-background">
				<div className="container mx-auto py-8">
					<div className="text-center">
						<p>Loading...</p>
					</div>
				</div>
			</div>
		);
	}

	if (roundLoading || eventLoading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="container mx-auto py-8">
					<div className="text-center">
						<p>Loading page data...</p>
					</div>
				</div>
			</div>
		);
	}

	if (roundError || !round) {
		return (
			<div className="min-h-screen bg-background">
				<div className="container mx-auto py-8">
					<div className="text-center">
						<h1 className="font-bold text-2xl text-destructive">
							Error Loading Round
						</h1>
						<p className="mt-2 text-muted-foreground">
							{roundError?.message || "Round not found"}
						</p>
						<Link href="/dashboard" className="mt-4 inline-block">
							<Button>Back to Dashboard</Button>
						</Link>
					</div>
				</div>
			</div>
		);
	}

	if (eventError || !event) {
		return (
			<div className="min-h-screen bg-background">
				<div className="container mx-auto py-8">
					<div className="text-center">
						<h1 className="font-bold text-2xl text-destructive">
							Error Loading Event
						</h1>
						<p className="mt-2 text-muted-foreground">
							{eventError?.message || "Event not found"}
						</p>
						<Link href="/dashboard" className="mt-4 inline-block">
							<Button>Back to Dashboard</Button>
						</Link>
					</div>
				</div>
			</div>
		);
	}

	if (questionsError) {
		return (
			<div className="min-h-screen bg-background">
				<div className="container mx-auto py-8">
					<div className="text-center">
						<h1 className="font-bold text-2xl text-destructive">
							Error Loading Questions
						</h1>
						<p className="mt-2 text-muted-foreground">
							{questionsError.message}
						</p>
						<Button onClick={() => refetchQuestions()} className="mt-4">
							Try Again
						</Button>
					</div>
				</div>
			</div>
		);
	}

	const formatTime = (seconds: number) => {
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return remainingSeconds > 0
			? `${minutes}m ${remainingSeconds}s`
			: `${minutes}m`;
	};

	// Calculate round time limit in seconds for questions
	const roundTimeMinutes = round.useEventDuration
		? event.durationMinutes
		: round.timeLimit || event.durationMinutes;
	const roundTimeLimitSeconds = (roundTimeMinutes || 60) * 60;

	// Calculate total question time if all questions use custom limits
	const totalCustomQuestionTime =
		questions?.reduce((total, question) => {
			if (question.useRoundDefault) {
				return total + roundTimeLimitSeconds;
			}
			return total + (question.timeLimit || 0);
		}, 0) || 0;

	if (questionsLoading) {
		return (
			<div className="min-h-screen bg-background">
				<header className="border-border border-b bg-card shadow-sm">
					<div className="container mx-auto px-4 py-4">
						<div className="flex items-center gap-4">
							<Link href={`/events/${round.eventId}/manage-rounds`}>
								<Button variant="ghost" size="sm">
									<ArrowLeft className="mr-2 h-4 w-4" />
									Back to Rounds
								</Button>
							</Link>
							<div>
								<h1 className="font-bold text-2xl">{round.title}</h1>
								<p className="text-muted-foreground">
									Manage questions • Duration:{" "}
									{formatTime(roundTimeLimitSeconds)}
								</p>
							</div>
						</div>
					</div>
				</header>
				<main className="container mx-auto px-4 py-8">
					<div className="text-center">
						<p>Loading questions...</p>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<header className="border-border border-b bg-card shadow-sm">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center gap-4">
						<Link href={`/events/${round.eventId}/manage-rounds`}>
							<Button variant="ghost" size="sm">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Rounds
							</Button>
						</Link>
						<div className="flex-1">
							<h1 className="font-bold text-2xl">{round.title}</h1>
							<p className="text-muted-foreground">
								Manage questions • Round Duration:{" "}
								{formatTime(roundTimeLimitSeconds)}
							</p>
						</div>
						<div className="text-right">
							<div className="flex items-center gap-2 text-sm">
								<Clock className="h-4 w-4" />
								<span className="font-medium">
									{questions?.length || 0} questions
								</span>
							</div>
							<p className="text-muted-foreground text-xs">
								Time limits in seconds • Max per question:{" "}
								{formatTime(roundTimeLimitSeconds)}
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				{roundTimeLimitSeconds === 0 && (
					<Alert className="mb-6">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Warning: This round has no defined duration. Questions will use a
							default time limit.
						</AlertDescription>
					</Alert>
				)}

				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="font-bold text-3xl">Questions</h2>
						<p className="mt-2 text-muted-foreground">
							Create questions with answer IDs for strict matching. Time limits
							are in seconds.
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Each question can use the round duration (
							{formatTime(roundTimeLimitSeconds)}) or a custom time limit.
						</p>
					</div>
					<SimpleCreateQuestionDialog
						round={round}
						event={event}
						onSuccess={() => refetchQuestions()}
					>
						<Button size="lg">
							<Plus className="mr-2 h-4 w-4" />
							Add Question
						</Button>
					</SimpleCreateQuestionDialog>
				</div>

				{!questions || questions.length === 0 ? (
					<div className="py-12 text-center">
						<div className="mx-auto max-w-md">
							<h3 className="mb-2 font-semibold text-xl">No questions yet</h3>
							<p className="mb-6 text-muted-foreground">
								Add your first question to get started with this quiz round.
							</p>
							<SimpleCreateQuestionDialog
								round={round}
								event={event}
								onSuccess={() => refetchQuestions()}
							>
								<Button size="lg">
									<Plus className="mr-2 h-4 w-4" />
									Add Your First Question
								</Button>
							</SimpleCreateQuestionDialog>
						</div>
					</div>
				) : (
					<SimpleQuestionEditorList
						questions={questions}
						round={round}
						event={event}
						onUpdate={() => refetchQuestions()}
					/>
				)}
			</main>
		</div>
	);
}
