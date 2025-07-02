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
import { Textarea } from "@/components/ui/textarea";
import type { Event, Round } from "@/lib/types";
import { api } from "@/trpc/react";
import { AlertTriangle, Clock, Info, Loader2, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
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
	const [customTimeLimit, setCustomTimeLimit] = useState(60);
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
			toast.error("Failed to create question");
		},
	});

	// Calculate constraints
	const roundTimeMinutes = round.useEventDuration
		? event.durationMinutes
		: round.timeLimit || event.durationMinutes;
	const maxQuestionTimeSeconds = (roundTimeMinutes ?? 30) * 60;
	const effectiveTimeLimit = useRoundDefault
		? (roundTimeMinutes ?? 30) * 60
		: customTimeLimit;

	// Check for duplicate answer IDs
	const answerValues = answerIds
		.map((item) => item.value.trim())
		.filter((value) => value);
	const hasDuplicates = answerValues.length !== new Set(answerValues).size;
	const duplicateIds = answerValues.filter(
		(value, index) => answerValues.indexOf(value) !== index,
	);

	const handleSubmit = async (formData: FormData) => {
		try {
			const filteredAnswerIds = answerIds
				.map((item) => item.value)
				.filter((id) => id.trim());

			// Check for duplicates before submitting
			if (new Set(filteredAnswerIds).size !== filteredAnswerIds.length) {
				toast.error(
					"Duplicate answer IDs found. Each answer ID must be unique.",
				);
				return;
			}

			const questionData = {
				roundId: round.id,
				questionId: formData.get("questionId") as string,
				answerIds: filteredAnswerIds,
				positivePoints: Number(formData.get("positivePoints")),
				negativePoints: Number(formData.get("negativePoints")),
				timeLimit: useRoundDefault
					? (roundTimeMinutes ?? 30) * 60
					: customTimeLimit,
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
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		}
		return `${secs}s`;
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
									Round Time: {formatTime((roundTimeMinutes ?? 30) * 60)}
								</span>
								<span>•</span>
								<span className="flex items-center gap-1">
									<Clock className="h-3 w-3" />
									Default: Round time limit
								</span>
							</AlertDescription>
						</Alert>

						<div className="grid gap-2">
							<Label htmlFor="questionId">Question ID</Label>
							<Textarea
								id="questionId"
								name="questionId"
								placeholder="Enter your question ID"
								rows={3}
								required
								disabled={createQuestion.isPending}
							/>
						</div>

						<div className="grid gap-2">
							<Label>Answer IDs</Label>
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
												className={`flex-1 ${isDuplicate ? "border-red-500 focus:border-red-500" : ""}`}
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
									className="w-full"
									disabled={createQuestion.isPending}
								>
									<Plus className="mr-2 h-4 w-4" />
									Add Answer ID
								</Button>
							</div>
							<p className="text-gray-500 text-xs">
								System will do strict matching with participant answers
							</p>

							{hasDuplicates && (
								<Alert variant="destructive">
									<AlertTriangle className="h-4 w-4" />
									<AlertDescription>
										Duplicate answer IDs found: {duplicateIds.join(", ")}. Each
										answer ID must be unique.
									</AlertDescription>
								</Alert>
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
									max="20"
									defaultValue="1"
									required
									disabled={createQuestion.isPending}
								/>
								<p className="text-gray-500 text-xs">
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
									min="-20"
									defaultValue="0"
									placeholder="0 for no penalty"
									disabled={createQuestion.isPending}
								/>
								<p className="text-gray-500 text-xs">
									Points deducted for wrong answer
								</p>
							</div>
						</div>

						<div className="grid gap-2">
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
										Use round default (
										{formatTime((roundTimeMinutes ?? 30) * 60)})
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
												setCustomTimeLimit(Number(e.target.value))
											}
											placeholder="Time in seconds"
											disabled={createQuestion.isPending}
										/>
										<p className="text-gray-500 text-xs">
											Max: {formatTime(maxQuestionTimeSeconds)} (round limit)
										</p>
									</div>
								)}
							</div>
						</div>

						{effectiveTimeLimit > maxQuestionTimeSeconds && (
							<Alert variant="destructive">
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									Time limit exceeds round maximum (
									{formatTime(maxQuestionTimeSeconds)})
								</AlertDescription>
							</Alert>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={createQuestion.isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={
								createQuestion.isPending ||
								effectiveTimeLimit > maxQuestionTimeSeconds ||
								hasDuplicates
							}
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
