"use client";

import type React from "react";

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Event, Round } from "@/lib/types";
import { api } from "@/trpc/react";
import { AlertTriangle, Clock, Info, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Define AnswerOption type locally since it's not exported
interface AnswerOption {
	id: string;
	text: string;
	is_correct: boolean;
	explanation?: string;
}

interface AdvancedCreateQuestionDialogProps {
	round: Round;
	event: Event;
	children: React.ReactNode;
	onSuccess?: () => void;
}

export function AdvancedCreateQuestionDialog({
	round,
	event,
	children,
	onSuccess,
}: AdvancedCreateQuestionDialogProps) {
	const [open, setOpen] = useState(false);
	const [questionText, setQuestionText] = useState("");
	const [questionType, setQuestionType] = useState("multiple_choice");
	const [positivePoints, setPositivePoints] = useState(1);
	const [negativePoints, setNegativePoints] = useState(0);
	const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([
		{ id: "1", text: "", is_correct: false },
		{ id: "2", text: "", is_correct: false },
		{ id: "3", text: "", is_correct: false },
		{ id: "4", text: "", is_correct: false },
	]);
	const [useDefaultTime, setUseDefaultTime] = useState(true);
	const [customTimeLimit, setCustomTimeLimit] = useState(60); // Default 60 seconds

	// TRPC mutation for creating questions
	const createQuestionMutation = api.questions.create.useMutation({
		onSuccess: () => {
			toast.success("Question created successfully!");
			setOpen(false);
			resetForm();
			onSuccess?.();
		},
		onError: (error) => {
			toast.error(`Error creating question: ${error.message}`);
		},
	});

	// Calculate constraints
	const roundTimeMinutes = round.useEventDuration
		? event.durationMinutes || 60
		: round.timeLimit || event.durationMinutes || 60;
	const maxQuestionTimeSeconds = Math.min(roundTimeMinutes * 60, 600); // Max 10 minutes per question
	const effectiveTimeLimit = useDefaultTime ? 60 : customTimeLimit; // Default to 60 seconds

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			// Convert answer options to simple answer IDs for the mutation
			const answerIds = answerOptions
				.filter((option) => option.is_correct)
				.map((option) => option.text.trim())
				.filter((text) => text.length > 0);

			await createQuestionMutation.mutateAsync({
				roundId: round.id,
				questionText,
				answerIds,
				positivePoints,
				negativePoints,
				timeLimit: effectiveTimeLimit,
			});
		} catch (error) {
			// Error is handled by onError callback
			console.error("Error creating question:", error);
		}
	};

	const resetForm = () => {
		setQuestionText("");
		setQuestionType("multiple_choice");
		setPositivePoints(1);
		setNegativePoints(0);
		setAnswerOptions([
			{ id: "1", text: "", is_correct: false },
			{ id: "2", text: "", is_correct: false },
			{ id: "3", text: "", is_correct: false },
			{ id: "4", text: "", is_correct: false },
		]);
		setUseDefaultTime(true);
		setCustomTimeLimit(60);
	};

	const addAnswerOption = () => {
		const newId = `option-${Date.now()}`;
		setAnswerOptions([
			...answerOptions,
			{ id: newId, text: "", is_correct: false },
		]);
	};

	const removeAnswerOption = (id: string) => {
		setAnswerOptions(answerOptions.filter((option) => option.id !== id));
	};

	const updateAnswerOption = (
		id: string,
		field: keyof AnswerOption,
		value: string | boolean,
	) => {
		setAnswerOptions(
			answerOptions.map((option) =>
				option.id === id ? { ...option, [field]: value } : option,
			),
		);
	};

	const toggleCorrectAnswer = (id: string) => {
		if (questionType === "multiple_choice" || questionType === "true_false") {
			// Single selection
			setAnswerOptions(
				answerOptions.map((option) => ({
					...option,
					is_correct: option.id === id,
				})),
			);
		} else if (questionType === "multiple_select") {
			// Multiple selection
			setAnswerOptions(
				answerOptions.map((option) =>
					option.id === id
						? { ...option, is_correct: !option.is_correct }
						: option,
				),
			);
		}
	};

	const formatTime = (seconds: number) => {
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		}
		return `${secs}s`;
	};

	const getCorrectAnswersCount = () => {
		return answerOptions.filter((option) => option.is_correct).length;
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Plus className="h-5 w-5" />
							Add New Question
						</DialogTitle>
						<DialogDescription>
							Create a new question for "{round.title}". Configure answer
							options, scoring, and time limits.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-6 py-4">
						<Alert>
							<Info className="h-4 w-4" />
							<AlertDescription className="flex items-center gap-4">
								<span>Round Time: {formatTime(roundTimeMinutes * 60)}</span>
								<span>•</span>
								<span>
									Max Question Time: {formatTime(maxQuestionTimeSeconds)}
								</span>
								<span>•</span>
								<span className="flex items-center gap-1">
									<Clock className="h-3 w-3" />
									Default: {formatTime(60)}
								</span>
							</AlertDescription>
						</Alert>

						<div className="grid gap-2">
							<Label htmlFor="questionText">Question Text</Label>
							<Textarea
								id="questionText"
								value={questionText}
								onChange={(e) => setQuestionText(e.target.value)}
								placeholder="Enter your question"
								rows={3}
								required
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="questionType">Question Type</Label>
								<Select value={questionType} onValueChange={setQuestionType}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="multiple_choice">
											Multiple Choice (Single Answer)
										</SelectItem>
										<SelectItem value="multiple_select">
											Multiple Select (Multiple Answers)
										</SelectItem>
										<SelectItem value="true_false">True/False</SelectItem>
										<SelectItem value="short_answer">Short Answer</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="grid gap-2">
								<Label>Time Limit</Label>
								<div className="flex items-center space-x-2">
									<Switch
										checked={useDefaultTime}
										onCheckedChange={setUseDefaultTime}
									/>
									<Label className="text-sm">
										Use default ({formatTime(60)})
									</Label>
								</div>
								{!useDefaultTime && (
									<div className="mt-2">
										<Input
											type="number"
											min="10"
											max={maxQuestionTimeSeconds}
											value={customTimeLimit}
											onChange={(e) =>
												setCustomTimeLimit(Number(e.target.value))
											}
											placeholder="Time in seconds"
										/>
										<p className="mt-1 text-muted-foreground text-xs">
											Max: {formatTime(maxQuestionTimeSeconds)}
										</p>
									</div>
								)}
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="positivePoints">Positive Points</Label>
								<Input
									id="positivePoints"
									type="number"
									min="1"
									max="20"
									value={positivePoints}
									onChange={(e) => setPositivePoints(Number(e.target.value))}
									required
								/>
								<p className="text-muted-foreground text-xs">
									Points awarded for correct answer
								</p>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="negativePoints">Negative Points</Label>
								<Input
									id="negativePoints"
									type="number"
									max="0"
									min="-20"
									value={negativePoints}
									onChange={(e) => setNegativePoints(Number(e.target.value))}
									placeholder="0 for no penalty"
								/>
								<p className="text-muted-foreground text-xs">
									Points deducted for wrong answer (negative or 0)
								</p>
							</div>
						</div>

						{(questionType === "multiple_choice" ||
							questionType === "multiple_select") && (
							<div className="grid gap-2">
								<Label>Answer Options</Label>
								<div className="space-y-3">
									{answerOptions.map((option, idx) => (
										<div
											key={option.id}
											className="space-y-2 rounded-lg border p-3"
										>
											<div className="flex items-center gap-2">
												<Checkbox
													checked={option.is_correct}
													onCheckedChange={() => toggleCorrectAnswer(option.id)}
												/>
												<Input
													value={option.text}
													onChange={(e) =>
														updateAnswerOption(
															option.id,
															"text",
															e.target.value,
														)
													}
													placeholder={`Option ${idx + 1}`}
													className="flex-1"
												/>
												{answerOptions.length > 2 && (
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => removeAnswerOption(option.id)}
													>
														<Minus className="h-4 w-4" />
													</Button>
												)}
											</div>
											<Input
												value={option.explanation || ""}
												onChange={(e) =>
													updateAnswerOption(
														option.id,
														"explanation",
														e.target.value,
													)
												}
												placeholder="Optional explanation for this answer"
												className="text-sm"
											/>
										</div>
									))}
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={addAnswerOption}
										className="w-full"
									>
										<Plus className="mr-2 h-4 w-4" />
										Add Answer Option
									</Button>
								</div>
								<div className="flex items-center gap-4 text-sm">
									{questionType === "multiple_select" && (
										<p className="text-blue-600">
											✓ Multiple answers can be correct
										</p>
									)}
									{questionType === "multiple_choice" && (
										<p className="text-orange-600">
											⚠ Only one answer can be correct
										</p>
									)}
									<p className="text-gray-600">
										Correct answers: {getCorrectAnswersCount()}
									</p>
								</div>
							</div>
						)}

						{questionType === "true_false" && (
							<div className="grid gap-2">
								<Label>Correct Answer</Label>
								<div className="flex gap-4">
									<label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 hover:bg-gray-50">
										<input
											type="radio"
											name="tfAnswer"
											checked={answerOptions.some(
												(opt) => opt.id === "true" && opt.is_correct,
											)}
											onChange={() => toggleCorrectAnswer("true")}
										/>
										<span className="font-medium">True</span>
									</label>
									<label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 hover:bg-gray-50">
										<input
											type="radio"
											name="tfAnswer"
											checked={answerOptions.some(
												(opt) => opt.id === "false" && opt.is_correct,
											)}
											onChange={() => toggleCorrectAnswer("false")}
										/>
										<span className="font-medium">False</span>
									</label>
								</div>
							</div>
						)}

						{questionType === "short_answer" && (
							<Alert>
								<Info className="h-4 w-4" />
								<AlertDescription>
									Short answer questions allow participants to type their
									response. The system will evaluate answers based on your
									grading criteria.
								</AlertDescription>
							</Alert>
						)}

						{effectiveTimeLimit > maxQuestionTimeSeconds && (
							<Alert variant="destructive">
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									Time limit exceeds maximum allowed (
									{formatTime(maxQuestionTimeSeconds)})
								</AlertDescription>
							</Alert>
						)}

						{getCorrectAnswersCount() === 0 &&
							questionType !== "short_answer" && (
								<Alert variant="destructive">
									<AlertTriangle className="h-4 w-4" />
									<AlertDescription>
										Please select at least one correct answer
									</AlertDescription>
								</Alert>
							)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={
								createQuestionMutation.isPending ||
								effectiveTimeLimit > maxQuestionTimeSeconds ||
								(getCorrectAnswersCount() === 0 &&
									questionType !== "short_answer")
							}
						>
							{createQuestionMutation.isPending
								? "Creating..."
								: "Create Question"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
