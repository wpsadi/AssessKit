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
import type { Event, Question, Round } from "@/lib/types";
import { api } from "@/trpc/react";
import {
	AlertTriangle,
	Award,
	Clock,
	Edit,
	GripVertical,
	Loader2,
	Minus,
	Plus,
	Save,
	Trash2,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DeleteQuestionDialog } from "./delete-question-dialog";

interface SimpleQuestionEditorProps {
	question: Question;
	index: number;
	round: Round;
	event: Event;
	onUpdate?: (updatedQuestion: Question) => void;
	onDelete?: (questionId: string) => void;
}

export function SimpleQuestionEditor({
	question,
	index,
	round,
	event,
	onUpdate,
	onDelete,
}: SimpleQuestionEditorProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [answerIds, setAnswerIds] = useState<string[]>(
		question.answerIds || [""],
	);
	const [useRoundDefault, setUseRoundDefault] = useState(
		question.useRoundDefault,
	);
	const [customTimeLimit, setCustomTimeLimit] = useState(
		question.timeLimit || 60,
	);
	const [errors, setErrors] = useState<{
		answerIds?: string;
		timeLimit?: string;
	}>({});

	const router = useRouter();

	// Generate stable keys for answer inputs
	const answerKeys = useMemo(() => {
		return answerIds.map(
			(_, index) => `answer-${question.id}-${index}-${Math.random()}`,
		);
	}, [answerIds.map, question.id]);

	// Check for duplicate answer IDs
	const answerValues = answerIds
		.map((id) => id.trim())
		.filter((value) => value);
	const hasDuplicates = answerValues.length !== new Set(answerValues).size;
	const duplicateIds = answerValues.filter(
		(value, index) => answerValues.indexOf(value) !== index,
	);

	const updateQuestion = api.questions.update.useMutation({
		onSuccess: (updatedQuestion) => {
			setIsEditing(false);
			toast.success("Question updated successfully");
			if (updatedQuestion) {
				onUpdate?.(updatedQuestion);
			}
		},
		onError: (error) => {
			console.error("Error updating question:", error);
			toast.error(error.message || "Failed to update question");
		},
	});

	// Calculate time constraints - convert round minutes to seconds
	const roundTimeMinutes = round.useEventDuration
		? event.durationMinutes
		: round.timeLimit || event.durationMinutes;
	const maxQuestionTimeSeconds = (roundTimeMinutes || 60) * 60; // Convert to seconds
	const effectiveTimeLimit = useRoundDefault
		? maxQuestionTimeSeconds
		: customTimeLimit;

	const validateForm = () => {
		const newErrors: typeof errors = {};

		// Validate answer IDs
		const validAnswerIds = answerIds.filter((id) => id.trim());
		if (validAnswerIds.length === 0) {
			newErrors.answerIds = "At least one answer ID is required";
		} else if (hasDuplicates) {
			newErrors.answerIds = `Duplicate answer IDs found: ${duplicateIds.join(", ")}`;
		}

		// Validate time limit
		if (!useRoundDefault) {
			if (customTimeLimit < 10) {
				newErrors.timeLimit = "Time limit must be at least 10 seconds";
			} else if (customTimeLimit > maxQuestionTimeSeconds) {
				newErrors.timeLimit = `Time limit cannot exceed ${formatTime(maxQuestionTimeSeconds)} (round duration)`;
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSave = async (formData: FormData) => {
		if (!validateForm()) {
			return;
		}

		try {
			const questionId = (formData.get("questionId") as string).trim();
			const positivePoints =
				Number.parseInt(formData.get("positivePoints") as string) || 1;
			const negativePoints =
				Number.parseInt(formData.get("negativePoints") as string) || 0;

			const filteredAnswerIds = answerIds.filter((id) => id.trim());

			await updateQuestion.mutateAsync({
				id: question.id,
				questionId,
				positivePoints,
				negativePoints,
				answerIds: filteredAnswerIds,
				useRoundDefault,
				timeLimit: useRoundDefault ? undefined : customTimeLimit,
			});
		} catch (error) {
			console.error("Error updating question:", error);
		}
	};

	const addAnswerId = () => {
		setAnswerIds([...answerIds, ""]);
	};

	const removeAnswerId = (index: number) => {
		setAnswerIds(answerIds.filter((_, i) => i !== index));
	};

	const updateAnswerId = (index: number, value: string) => {
		const newAnswerIds = [...answerIds];
		newAnswerIds[index] = value;
		setAnswerIds(newAnswerIds);
	};

	const formatTime = (seconds: number) => {
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return remainingSeconds > 0
			? `${minutes}m ${remainingSeconds}s`
			: `${minutes}m`;
	};

	const renderQuestionPreview = () => (
		<Card className="transition-shadow hover:shadow-md">
			<CardHeader>
				<div className="flex items-start gap-4">
					<GripVertical className="mt-1 h-5 w-5 flex-shrink-0 text-gray-400" />
					<div className="flex-1">
						<div className="mb-2 flex items-start justify-between">
							<CardTitle className="text-lg">
								Question {index}: {question.questionId}
							</CardTitle>
							<div className="flex gap-2">
								{question.negativePoints < 0 && (
									<Badge variant="destructive" className="text-xs">
										Penalty
									</Badge>
								)}
								{question.useRoundDefault && (
									<Badge variant="outline" className="text-xs">
										Round Default
									</Badge>
								)}
							</div>
						</div>

						<div className="mt-3">
							<p className="mb-2 font-medium text-gray-700 text-sm">
								Answer IDs:
							</p>
							<div className="flex flex-wrap gap-2">
								{question.answerIds.map((id, idx) => (
									<Badge
										key={`preview-${question.id}-${idx}`}
										variant="outline"
										className="text-green-600"
									>
										{id}
									</Badge>
								))}
							</div>
						</div>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				<div className="flex items-center gap-6 text-gray-600 text-sm">
					<div className="flex items-center gap-1">
						<Award className="h-4 w-4 text-green-600" />
						<span>+{question.positivePoints}</span>
					</div>
					{question.negativePoints < 0 && (
						<div className="flex items-center gap-1">
							<Award className="h-4 w-4 text-red-600" />
							<span>{question.negativePoints}</span>
						</div>
					)}
					<div className="flex items-center gap-1">
						<Clock className="h-4 w-4" />
						<span>
							{question.useRoundDefault
								? `${formatTime(maxQuestionTimeSeconds)} (round default)`
								: `${formatTime(question.timeLimit || 60)}`}
						</span>
					</div>
				</div>
			</CardContent>

			<CardFooter className="flex justify-between">
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsEditing(true)}
						disabled={updateQuestion.isPending}
					>
						{updateQuestion.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Loading...
							</>
						) : (
							<>
								<Edit className="mr-2 h-4 w-4" />
								Edit
							</>
						)}
					</Button>
					<DeleteQuestionDialog
						question={question}
						onSuccess={() => onDelete?.(question.id)}
					>
						<Button
							variant="ghost"
							size="sm"
							className="text-red-600 hover:text-red-700"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</DeleteQuestionDialog>
				</div>
			</CardFooter>
		</Card>
	);

	const renderQuestionEditor = () => (
		<Card className="border-blue-200 shadow-md">
			<form action={handleSave}>
				<CardHeader>
					<div className="flex items-start gap-4">
						<GripVertical className="mt-1 h-5 w-5 flex-shrink-0 text-gray-400" />
						<div className="flex-1">
							<CardTitle className="mb-4 text-lg">
								Editing Question {index}
							</CardTitle>

							{round.useEventDuration && (
								<Alert className="mb-4">
									<AlertDescription>
										This round uses the full event duration.{" "}
										<b>Each question can use up to the full event duration.</b> The time limit is{" "}
										<b>not cumulative</b> across questions.
									</AlertDescription>
								</Alert>
							)}

							<div className="grid gap-6">
								<div className="grid gap-2">
									<Label htmlFor="questionId">Question ID *</Label>
									<Textarea
										id="questionId"
										name="questionId"
										defaultValue={question.questionId}
										placeholder="Enter your question ID or text"
										rows={3}
										required
										disabled={updateQuestion.isPending}
									/>
								</div>

								<div className="grid gap-2">
									<Label>Answer IDs *</Label>
									<div className="space-y-2">
										{answerIds.map((id, idx) => {
											const isDuplicate =
												id.trim() && duplicateIds.includes(id.trim());
											return (
												<div
													key={answerKeys[idx]}
													className="flex items-center gap-2"
												>
													<Input
														value={id}
														onChange={(e) =>
															updateAnswerId(idx, e.target.value)
														}
														placeholder={`Answer ID ${idx + 1}`}
														className={`flex-1 ${isDuplicate ? "border-destructive" : ""}`}
														disabled={updateQuestion.isPending}
													/>
													{answerIds.length > 1 && (
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => removeAnswerId(idx)}
															disabled={updateQuestion.isPending}
														>
															<Minus className="h-4 w-4" />
														</Button>
													)}
												</div>
											);
										})}
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={addAnswerId}
											className="w-full bg-transparent"
											disabled={updateQuestion.isPending}
										>
											<Plus className="mr-2 h-4 w-4" />
											Add Answer ID
										</Button>
									</div>
									<p className="text-muted-foreground text-xs">
										System will do strict matching with participant answers
									</p>
									{errors.answerIds && (
										<p className="text-destructive text-sm">
											{errors.answerIds}
										</p>
									)}
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="grid gap-2">
										<Label htmlFor="positivePoints">Positive Points</Label>
										<Input
											id="positivePoints"
											name="positivePoints"
											type="number"
											min="1"
											max="100"
											defaultValue={question.positivePoints}
											required
											disabled={updateQuestion.isPending}
										/>
									</div>

									<div className="grid gap-2">
										<Label htmlFor="negativePoints">Negative Points</Label>
										<Input
											id="negativePoints"
											name="negativePoints"
											type="number"
											max="0"
											min="-100"
											defaultValue={question.negativePoints}
											placeholder="0 for no penalty"
											disabled={updateQuestion.isPending}
										/>
										<p className="text-muted-foreground text-xs">
											Enter negative value or 0
										</p>
									</div>
								</div>

								<div className="grid gap-4">
									<Label>Time Limit</Label>
									<div className="space-y-3">
										<div className="flex items-center space-x-2">
											<Checkbox
												checked={useRoundDefault}
												onCheckedChange={(checked) =>
													setUseRoundDefault(checked === true)
												}
												disabled={updateQuestion.isPending}
											/>
											<Label className="text-sm">
												Use round duration ({formatTime(maxQuestionTimeSeconds)}
												)
											</Label>
										</div>

										{!useRoundDefault && (
											<div className="space-y-2">
												<Input
													type="number"
													min="10"
													max={maxQuestionTimeSeconds}
													value={customTimeLimit}
													onChange={(e) =>
														setCustomTimeLimit(
															Math.max(10, Number(e.target.value)),
														)
													}
													placeholder="Time in seconds"
													disabled={updateQuestion.isPending}
													className={
														errors.timeLimit ? "border-destructive" : ""
													}
												/>
												<p className="text-muted-foreground text-xs">
													Range: 10 seconds to{" "}
													{formatTime(maxQuestionTimeSeconds)} (round duration)
												</p>
												{errors.timeLimit && (
													<p className="text-destructive text-sm">
														{errors.timeLimit}
													</p>
												)}
											</div>
										)}

										<div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
											<p className="text-blue-700 text-sm">
												<strong>Effective Time Limit:</strong>{" "}
												{formatTime(effectiveTimeLimit)}
											</p>
										</div>
									</div>
								</div>

								{Object.keys(errors).length > 0 && (
									<Alert variant="destructive">
										<AlertTriangle className="h-4 w-4" />
										<AlertDescription>
											Please fix the errors above before saving.
										</AlertDescription>
									</Alert>
								)}
							</div>
						</div>
					</div>
				</CardHeader>

				<CardFooter className="flex justify-between">
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							setIsEditing(false);
							setErrors({});
						}}
						disabled={updateQuestion.isPending}
					>
						<X className="mr-2 h-4 w-4" />
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={
							updateQuestion.isPending || Object.keys(errors).length > 0
						}
						onClick={() => validateForm()}
					>
						{updateQuestion.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Saving...
							</>
						) : (
							<>
								<Save className="mr-2 h-4 w-4" />
								Save Changes
							</>
						)}
					</Button>
				</CardFooter>
			</form>
		</Card>
	);

	return isEditing ? renderQuestionEditor() : renderQuestionPreview();
}
