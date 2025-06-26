"use client";

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
import type { AppRouter } from "@/server/api/root";
import { api } from "@/trpc/react";
import type { inferRouterOutputs } from "@trpc/server";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Response = RouterOutput["responses"]["getById"];

interface EditAnswerDialogProps {
	answer: NonNullable<Response>;
	participantId: string;
	onSuccess?: () => void;
	children: React.ReactNode;
}

export function EditAnswerDialog({
	answer,
	participantId,
	onSuccess,
	children,
}: EditAnswerDialogProps) {
	const [open, setOpen] = useState(false);
	const [submittedAnswer, setSubmittedAnswer] = useState(
		answer.submittedAnswer,
	);
	const [pointsEarned, setPointsEarned] = useState(answer.pointsEarned);
	const [isCorrect, setIsCorrect] = useState(answer.isCorrect);
	const [timeTaken, setTimeTaken] = useState(answer.timeTaken || 0);

	const updateResponseMutation = api.responses.update.useMutation({
		onSuccess: () => {
			toast.success("Answer updated successfully!");
			onSuccess?.();
			setOpen(false);
		},
		onError: (error) => {
			toast.error(`Error updating answer: ${error.message}`);
		},
	});

	useEffect(() => {
		if (open) {
			setSubmittedAnswer(answer.submittedAnswer);
			setPointsEarned(answer.pointsEarned);
			setIsCorrect(answer.isCorrect);
			setTimeTaken(answer.timeTaken || 0);
		}
	}, [open, answer]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await updateResponseMutation.mutateAsync({
			id: answer.id,
			submittedAnswer,
			pointsEarned,
			isCorrect,
			timeTaken,
		});
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Edit Answer</DialogTitle>
						<DialogDescription>
							Update the participant's answer and scoring for this question.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="submitted_answer">Submitted Answer</Label>
							<Textarea
								id="submitted_answer"
								value={submittedAnswer}
								onChange={(e) => setSubmittedAnswer(e.target.value)}
								rows={3}
								required
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="points_earned">Points Earned</Label>
								<Input
									id="points_earned"
									type="number"
									value={pointsEarned}
									onChange={(e) => setPointsEarned(Number(e.target.value))}
									required
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="time_taken">Time Taken (seconds)</Label>
								<Input
									id="time_taken"
									type="number"
									value={timeTaken}
									onChange={(e) => setTimeTaken(Number(e.target.value))}
									placeholder="Optional"
								/>
							</div>
						</div>

						<div className="flex items-center space-x-2">
							<Checkbox
								id="is_correct"
								checked={isCorrect}
								onCheckedChange={(checked) => setIsCorrect(Boolean(checked))}
							/>
							<Label htmlFor="is_correct">Mark as Correct</Label>
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
						<Button type="submit" disabled={updateResponseMutation.isPending}>
							{updateResponseMutation.isPending
								? "Updating..."
								: "Update Answer"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
