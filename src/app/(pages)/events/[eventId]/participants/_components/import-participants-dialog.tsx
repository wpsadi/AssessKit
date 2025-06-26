"use client";

import type React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Info, Upload } from "lucide-react";
import { useState } from "react";

interface ImportParticipantsDialogProps {
	eventId: string;
	children: React.ReactNode;
}

export function ImportParticipantsDialog({
	eventId,
	children,
}: ImportParticipantsDialogProps) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [file, setFile] = useState<File | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) return;

		setIsLoading(true);
		try {
			// In a real app, you would parse the CSV and create participants
			// For now, just simulate the process
			await new Promise((resolve) => setTimeout(resolve, 2000));
			alert("CSV import functionality would be implemented here");
			setOpen(false);
		} catch (error) {
			console.error("Error importing participants:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Import Participants from CSV</DialogTitle>
						<DialogDescription>
							Upload a CSV file with participant information to bulk add
							participants to this event.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<Alert>
							<Info className="h-4 w-4" />
							<AlertDescription>
								CSV file should have columns: <strong>name</strong>,{" "}
								<strong>email</strong>
								<br />
								Example: John Doe, john@example.com
							</AlertDescription>
						</Alert>

						<div className="grid gap-2">
							<Label htmlFor="csvFile">CSV File</Label>
							<Input
								id="csvFile"
								type="file"
								accept=".csv"
								onChange={(e) => setFile(e.target.files?.[0] || null)}
								required
							/>
						</div>

						{file && (
							<div className="text-gray-600 text-sm">
								Selected file: {file.name} ({Math.round(file.size / 1024)} KB)
							</div>
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
						<Button type="submit" disabled={isLoading || !file}>
							<Upload className="mr-2 h-4 w-4" />
							{isLoading ? "Importing..." : "Import Participants"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
