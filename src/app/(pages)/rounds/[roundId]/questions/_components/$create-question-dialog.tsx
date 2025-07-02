"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { useState } from "react";
import { toast } from "sonner";

interface CreateQuestionDialogProps {
	roundId: string;
	children: React.ReactNode;
	onSuccess?: () => void;
}

export function CreateQuestionDialog({
	roundId,
	children,
	onSuccess,
}: CreateQuestionDialogProps) {
	const [open, setOpen] = useState(false);
	const [questionText, setQuestionText] = useState("");
	const [questionType, setQuestionType] = useState("multiple_choice");
	const [points, setPoints] = useState(1);
	const [options, setOptions] = useState("");
	const [correctAnswer, setCorrectAnswer] = useState("");
	const [timeLimit, setTimeLimit] = useState(30);

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			// Convert answer to array format expected by the mutation
			const answerIds = [correctAnswer.trim()];

			await createQuestionMutation.mutateAsync({
				roundId,
				questionId: questionText,
				answerIds,
				positivePoints: points,
				negativePoints: 0,
				timeLimit,
			});
		} catch (error) {
			// Error is handled by onError callback
			console.error("Error creating question:", error);
		}
	};

	const resetForm = () => {
		setQuestionText("");
		setQuestionType("multiple_choice");
		setPoints(1);
		setOptions("");
		setCorrectAnswer("");
		setTimeLimit(30);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[600px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Add New Question</DialogTitle>
						<DialogDescription>
							Create a new question for this round. Choose the question type and
							provide the correct answer.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="questionId">Question ID</Label>
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
											Multiple Choice
										</SelectItem>
										<SelectItem value="true_false">True/False</SelectItem>
										<SelectItem value="short_answer">Short Answer</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="points">Points</Label>
								<Input
									id="points"
									type="number"
									min="1"
									max="10"
									value={points}
									onChange={(e) => setPoints(Number(e.target.value))}
									required
								/>
							</div>
						</div>

						{questionType === "multiple_choice" && (
							<div className="grid gap-2">
								<Label htmlFor="options">Options (comma-separated)</Label>
								<Input
									id="options"
									value={options}
									onChange={(e) => setOptions(e.target.value)}
									placeholder="Option 1, Option 2, Option 3, Option 4"
									required
								/>
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="correctAnswer">Correct Answer</Label>
								<Input
									id="correctAnswer"
									value={correctAnswer}
									onChange={(e) => setCorrectAnswer(e.target.value)}
									placeholder={
										questionType === "true_false"
											? "True or False"
											: questionType === "multiple_choice"
												? "Exact option text"
												: "Enter the correct answer"
									}
									required
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="timeLimit">Time Limit (seconds)</Label>
								<Input
									id="timeLimit"
									type="number"
									min="10"
									max="300"
									value={timeLimit}
									onChange={(e) => setTimeLimit(Number(e.target.value))}
									required
								/>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={createQuestionMutation.isPending}>
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
