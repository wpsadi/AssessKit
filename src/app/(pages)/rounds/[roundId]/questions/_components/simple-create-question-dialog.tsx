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
import type { Event, Round } from "@/lib/types";
import { api } from "@/trpc/react";
import { Clock, Info, Loader2, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface AnswerIdItem {
	id: string;
	value: string;
}

interface SimpleCreateQuestionDialogProps {
	round: Round;
	event: Event;
	children: React.ReactNode;
	onSuccess?: () => void;
}

export function SimpleCreateQuestionDialog({
	round,
	event,
	children,
	onSuccess,
}: SimpleCreateQuestionDialogProps) {
	const [open, setOpen] = useState(false);
	const [answerIds, setAnswerIds] = useState<AnswerIdItem[]>([
		{ id: crypto.randomUUID(), value: "" },
	]);
	const [useRoundDefault, setUseRoundDefault] = useState(true);
	const [customTimeLimit, setCustomTimeLimit] = useState(60); // seconds
	const [errors, setErrors] = useState<{
		questionId?: string;
		answerIds?: string;
		timeLimit?: string;
		points?: string;
	}>({});

	const router = useRouter();

	const createQuestion = api.questions.create.useMutation({
		onSuccess: () => {
			setOpen(false);
			resetForm();
			toast.success("Question created successfully");
			onSuccess?.();
			router.refresh();
		},
		onError: (error) => {
			console.error("Error creating question:", error);
			toast.error(error.message || "Failed to create question");
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

	// Check for duplicate answer IDs
	const answerValues = answerIds
		.map((item) => item.value.trim())
		.filter((value) => value);
	const hasDuplicates = answerValues.length !== new Set(answerValues).size;
	const duplicateIds = answerValues.filter(
		(value, index) => answerValues.indexOf(value) !== index,
	);

	const validateForm = () => {
		const newErrors: typeof errors = {};

		// Validate answer IDs
		const validAnswerIds = answerIds.filter((item) => item.value.trim());
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

	const handleSubmit = async (formData: FormData) => {
		if (!validateForm()) {
			return;
		}

		try {
			const filteredAnswerIds = answerIds
				.map((item) => item.value.trim())
				.filter((id) => id);

			const questionData = {
				roundId: round.id,
				questionId: (formData.get("questionId") as string).trim(),
				answerIds: filteredAnswerIds,
				positivePoints: Number(formData.get("positivePoints")) || 1,
				negativePoints: Number(formData.get("negativePoints")) || 0,
				useRoundDefault,
				timeLimit: useRoundDefault ? undefined : customTimeLimit,
			};

			await createQuestion.mutateAsync(questionData);
		} catch (error) {
			console.error("Error creating question:", error);
		}
	};

	const resetForm = () => {
		setAnswerIds([{ id: crypto.randomUUID(), value: "" }]);
		setUseRoundDefault(true);
		setCustomTimeLimit(60);
		setErrors({});
	};

	const addAnswerId = useCallback(() => {
		setAnswerIds((prev) => [...prev, { id: crypto.randomUUID(), value: "" }]);
	}, []);

	const removeAnswerId = useCallback((idToRemove: string) => {
		setAnswerIds((prev) => prev.filter((item) => item.id !== idToRemove));
	}, []);

	const updateAnswerId = useCallback((id: string, value: string) => {
		setAnswerIds((prev) =>
			prev.map((item) => (item.id === id ? { ...item, value } : item)),
		);
	}, []);

	const formatTime = (seconds: number) => {
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return remainingSeconds > 0
			? `${minutes}m ${remainingSeconds}s`
			: `${minutes}m`;
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
				<form action={handleSubmit}>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Plus className="h-5 w-5" />
							Add New Question
						</DialogTitle>
						<DialogDescription>
							Create a new question for "{round.title}". Add answer IDs for
							strict matching.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-6 py-4">
						<Alert>
							<Info className="h-4 w-4" />
							<AlertDescription className="flex items-center gap-4">
								<span>
									Round Duration: {formatTime(maxQuestionTimeSeconds)}
								</span>
								<span>•</span>
								<span className="flex items-center gap-1">
									<Clock className="h-3 w-3" />
									Default: Use full round duration
								</span>
							</AlertDescription>
						</Alert>

						{round.useEventDuration && (
							<Alert className="mb-4">
								<AlertDescription>
									This round uses the full event duration.{" "}
									<b>Each question can use up to the full event duration.</b> The
									time limit is <b>not cumulative</b> across questions.
								</AlertDescription>
							</Alert>
						)}

						<div className="grid gap-2">
							<Label htmlFor="questionId">Question ID *</Label>
							<Textarea
								id="questionId"
								name="questionId"
								placeholder="Enter your question ID or text"
								rows={3}
								required
								disabled={createQuestion.isPending}
								className={errors.questionId ? "border-destructive" : ""}
							/>
							{errors.questionId && (
								<p className="text-destructive text-sm">{errors.questionId}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label>Answer IDs *</Label>
							<div className="space-y-2">
								{answerIds.map((item, idx) => {
									const isDuplicate =
										item.value.trim() &&
										duplicateIds.includes(item.value.trim());
									return (
										<div key={item.id} className="flex items-center gap-2">
											<Input
												value={item.value}
												onChange={(e) =>
													updateAnswerId(item.id, e.target.value)
												}
												placeholder={`Answer ID ${idx + 1}`}
												className={`flex-1 ${isDuplicate ? "border-destructive" : ""}`}
												disabled={createQuestion.isPending}
											/>
											{answerIds.length > 1 && (
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => removeAnswerId(item.id)}
													disabled={createQuestion.isPending}
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
									disabled={createQuestion.isPending}
								>
									<Plus className="mr-2 h-4 w-4" />
									Add Answer ID
								</Button>
							</div>
							<p className="text-muted-foreground text-xs">
								System will do strict matching with participant answers
							</p>
							{errors.answerIds && (
								<p className="text-destructive text-sm">{errors.answerIds}</p>
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
									defaultValue="1"
									disabled={createQuestion.isPending}
								/>
								<p className="text-muted-foreground text-xs">
									Points awarded for correct answer
								</p>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="negativePoints">Negative Points</Label>
								<Input
									id="negativePoints"
									name="negativePoints"
									type="number"
									max="0"
									min="-100"
									defaultValue="0"
									placeholder="0 for no penalty"
									disabled={createQuestion.isPending}
								/>
								<p className="text-muted-foreground text-xs">
									Points deducted for wrong answer
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
										disabled={createQuestion.isPending}
									/>
									<Label className="text-sm">
										Use round duration ({formatTime(maxQuestionTimeSeconds)})
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
												setCustomTimeLimit(Math.max(10, Number(e.target.value)))
											}
											placeholder="Time in seconds"
											disabled={createQuestion.isPending}
											className={errors.timeLimit ? "border-destructive" : ""}
										/>
										<p className="text-muted-foreground text-xs">
											Range: 10 seconds to {formatTime(maxQuestionTimeSeconds)}{" "}
											(round duration)
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
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setOpen(false);
								resetForm();
							}}
							disabled={createQuestion.isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={
								createQuestion.isPending || Object.keys(errors).length > 0
							}
							onClick={() => validateForm()}
						>
							{createQuestion.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating...
								</>
							) : (
								"Create Question"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
