"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Response } from "@/lib/types";
import {
	CheckCircle,
	Clock,
	Edit,
	Loader2,
	Trophy,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { EditAnswerDialog } from "./edit-answer-dialog";

interface ParticipantAnswersListProps {
	answers: Response[];
	participantId: string;
	eventId: string;
}

interface Question {
	id: string;
	text: string;
	roundId: string;
	roundTitle?: string;
	correctAnswerIds: string[];
}

export function ParticipantAnswersList({
	answers,
	participantId,
	eventId,
}: ParticipantAnswersListProps) {
	const [searchTerm, setSearchTerm] = useState("");
	const [questions, setQuestions] = useState<Record<string, Question>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch question details
	useEffect(() => {
		const fetchQuestions = async () => {
			try {
				setLoading(true);
				const questionIds = [
					...new Set(
						answers.map((answer) => answer.questionId).filter(Boolean),
					),
				];

				const questionsData: Record<string, Question> = {};

				// Fetch each question's details
				await Promise.all(
					questionIds.map(async (questionId) => {
						try {
							const response = await fetch(
								`/api/events/${eventId}/questions/${questionId}`,
							);
							if (response.ok) {
								const question = await response.json();
								questionsData[questionId] = {
									id: question.id,
									text: question.text || question.question_text,
									roundId: question.roundId || question.round_id,
									roundTitle:
										question.roundTitle ||
										question.round_title ||
										"Unknown Round",
									correctAnswerIds:
										question.correctAnswerIds ||
										question.correct_answer_ids ||
										[],
								};
							}
						} catch (err) {
							console.error(`Failed to fetch question ${questionId}:`, err);
						}
					}),
				);

				setQuestions(questionsData);
			} catch (err) {
				setError("Failed to load question details");
				console.error("Error fetching questions:", err);
			} finally {
				setLoading(false);
			}
		};

		if (answers.length > 0) {
			fetchQuestions();
		} else {
			setLoading(false);
		}
	}, [answers, eventId]);

	const filteredAnswers = answers.filter((answer) => {
		const question = questions[answer.questionId || ""];
		return (
			(question?.text?.toLowerCase() ?? "").includes(
				searchTerm.toLowerCase(),
			) ||
			(answer.submittedAnswer?.toLowerCase() ?? "").includes(
				searchTerm.toLowerCase(),
			) ||
			(answer.questionId?.toLowerCase() ?? "").includes(
				searchTerm.toLowerCase(),
			)
		);
	});

	const groupedAnswers = filteredAnswers.reduce(
		(acc, answer) => {
			const question = questions[answer.questionId || ""];
			const roundTitle = question?.roundTitle || "Unknown Round";
			if (!acc[roundTitle]) {
				acc[roundTitle] = [];
			}
			acc[roundTitle].push(answer);
			return acc;
		},
		{} as Record<string, Response[]>,
	);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="mr-2 h-6 w-6 animate-spin" />
				<span>Loading question details...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="py-8 text-center">
				<p className="text-destructive">{error}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<div className="relative max-w-sm flex-1">
					<Input
						placeholder="Search questions or answers..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
				<div className="text-muted-foreground text-sm">
					{filteredAnswers.length} of {answers.length} responses
				</div>
			</div>

			{Object.entries(groupedAnswers).map(([roundTitle, roundAnswers]) => (
				<div key={roundTitle} className="space-y-4">
					<h3 className="border-b pb-2 font-semibold text-lg">{roundTitle}</h3>

					<div className="grid gap-4">
						{roundAnswers.map((answer) => {
							const question = questions[answer.questionId || ""];
							return (
								<Card
									key={answer.id}
									className="transition-shadow hover:shadow-md"
								>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<CardTitle className="mb-2 text-base">
													{question?.text ||
														answer.questionId ||
														"No question text"}
												</CardTitle>
												<div className="flex items-center gap-4 text-muted-foreground text-sm">
													<div className="flex items-center gap-1">
														<Clock className="h-3 w-3" />
														{answer.timeTaken
															? `${answer.timeTaken}s`
															: "No time recorded"}
													</div>
													<div className="flex items-center gap-1">
														<Trophy className="h-3 w-3" />
														{answer.pointsEarned || 0} points
													</div>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Badge
													variant={answer.isCorrect ? "default" : "destructive"}
													className="flex items-center gap-1"
												>
													{answer.isCorrect ? (
														<CheckCircle className="h-3 w-3" />
													) : (
														<XCircle className="h-3 w-3" />
													)}
													{answer.isCorrect ? "Correct" : "Incorrect"}
												</Badge>
												<EditAnswerDialog
													answer={{
														id: answer.id,
														participantId:
															answer.participantId || participantId,
														questionId: answer.questionId || "",
														roundId: answer.roundId || question?.roundId || "",
														submittedAnswer: answer.submittedAnswer ?? "",
														isCorrect: answer.isCorrect ?? false,
														pointsEarned: answer.pointsEarned ?? 0,
														timeTaken: answer.timeTaken ?? 0,
														submittedAt: answer.submittedAt || new Date(),
													}}
													participantId={participantId}
												>
													<Button variant="outline" size="sm">
														<Edit className="mr-1 h-3 w-3" />
														Edit
													</Button>
												</EditAnswerDialog>
											</div>
										</div>
									</CardHeader>

									<CardContent>
										<div className="space-y-3">
											<div>
												<Label className="font-medium text-sm">
													Submitted Answer:
												</Label>
												<div className="mt-1 rounded-md bg-muted p-3">
													<code className="text-sm">
														{answer.submittedAnswer ?? "No answer submitted"}
													</code>
												</div>
											</div>

											<div>
												<Label className="font-medium text-sm">
													Correct Answer IDs:
												</Label>
												<div className="mt-1 rounded-md bg-muted p-3">
													<code className="text-sm">
														{question?.correctAnswerIds?.join(", ") ||
															"No answer IDs available"}
													</code>
												</div>
											</div>

											<div className="text-muted-foreground text-xs">
												Submitted:{" "}
												{answer.submittedAt
													? new Date(answer.submittedAt).toLocaleString()
													: "Unknown"}
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</div>
			))}

			{filteredAnswers.length === 0 && searchTerm && (
				<div className="py-8 text-center">
					<p className="text-muted-foreground">
						No responses found matching "{searchTerm}"
					</p>
				</div>
			)}

			{answers.length === 0 && (
				<div className="py-8 text-center">
					<p className="text-muted-foreground">No responses available</p>
				</div>
			)}
		</div>
	);
}
