"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";

interface DeleteAnswerDialogProps {
	answerId: string;
	onSuccess?: () => void;
	children: React.ReactNode;
}

export function DeleteAnswerDialog({
	answerId,
	onSuccess,
	children,
}: DeleteAnswerDialogProps) {
	const [open, setOpen] = useState(false);

	const deleteResponseMutation = api.responses.delete.useMutation({
		onSuccess: () => {
			toast.success("Answer deleted successfully!");
			onSuccess?.();
			setOpen(false);
		},
		onError: (error) => {
			toast.error(`Error deleting answer: ${error.message}`);
		},
	});

	const handleDelete = () => {
		deleteResponseMutation.mutate({ id: answerId });
	};

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete the
						answer/response.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={deleteResponseMutation.isPending}
					>
						{deleteResponseMutation.isPending ? "Deleting..." : "Delete"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
