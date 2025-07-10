"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type React from "react";

import { api } from "@/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntityQueries } from "@/lib/query-keys";
import {
	AlertCircle,
	CheckCircle,
	FileText,
	Loader2,
	Upload,
	X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { toast } from "sonner";

interface CSVRow {
	name: string;
	email: string;
	rowIndex: number;
}

interface ValidationError {
	row: number;
	field: string;
	message: string;
}

interface CSVImportWidgetProps {
	eventId: string;
	onImportComplete?: (count: number) => void;
}

export default function CSVImportWidget({
	onImportComplete,
}: CSVImportWidgetProps) {
	const { width, height } = useWindowSize();
	const { eventId } = useParams<{ eventId: string }>();
	const bulkInsertionHook = api.participants.bulkCreate.useMutation();
	const queryClient = useQueryClient();

	const [isOpen, setIsOpen] = useState(false);
	const [csvData, setCsvData] = useState<CSVRow[]>([]);
	const [rawHeaders, setRawHeaders] = useState<string[]>([]);
	const [isDragOver, setIsDragOver] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [fileName, setFileName] = useState("");
	const [showConfetti, setShowConfetti] = useState(false);

	// Email validation regex
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	// Parse CSV content
	const parseCSV = (
		content: string,
	): { headers: string[]; rows: string[][] } => {
		const lines = content.trim().split("\n");
		if (lines.length === 0) return { headers: [], rows: [] };

		const headers = lines[0]
			? lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
			: [];
		const rows = lines
			.slice(1)
			.map((line) =>
				line.split(",").map((cell) => cell.trim().replace(/"/g, "")),
			);

		return { headers, rows };
	};

	// Validate CSV data
	const validateData = useMemo(() => {
		const errors: ValidationError[] = [];
		const emailSet = new Set<string>();
		const duplicateEmails = new Set<string>();

		// Check if required columns exist
		const nameIndex = rawHeaders.findIndex((h) => h.toLowerCase() === "name");
		const emailIndex = rawHeaders.findIndex((h) => h.toLowerCase() === "email");

		if (nameIndex === -1) {
			errors.push({
				row: 0,
				field: "structure",
				message: 'Missing required column: "name"',
			});
		}

		if (emailIndex === -1) {
			errors.push({
				row: 0,
				field: "structure",
				message: 'Missing required column: "email"',
			});
		}

		// Validate each row
		csvData.forEach((row, index) => {
			// Validate email
			if (!row.email || row.email.trim() === "") {
				errors.push({
					row: index + 1,
					field: "email",
					message: "Email is required",
				});
			} else if (!emailRegex.test(row.email)) {
				errors.push({
					row: index + 1,
					field: "email",
					message: "Invalid email format",
				});
			} else {
				// Check for duplicates
				const email = row.email.toLowerCase();
				if (emailSet.has(email)) {
					duplicateEmails.add(email);
					errors.push({
						row: index + 1,
						field: "email",
						message: "Duplicate email found",
					});
				} else {
					emailSet.add(email);
				}
			}
		});

		return { errors, duplicateEmails: Array.from(duplicateEmails) };
	}, [csvData, rawHeaders]);

	// Handle file drop
	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		const files = Array.from(e.dataTransfer.files);
		const csvFile = files.find(
			(file) => file.type === "text/csv" || file.name.endsWith(".csv"),
		);

		if (csvFile) {
			processFile(csvFile);
		}
	}, []);

	// Handle file input
	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			processFile(file);
		}
	};

	// Process uploaded file
	const processFile = (file: File) => {
		setIsProcessing(true);
		setFileName(file.name);
		const reader = new FileReader();

		reader.onload = (e) => {
			const content = e.target?.result as string;
			const { headers, rows } = parseCSV(content);
			setRawHeaders(headers);

			// Map to required structure
			const nameIndex = headers.findIndex((h) => h.toLowerCase() === "name");
			const emailIndex = headers.findIndex((h) => h.toLowerCase() === "email");

			const mappedData: CSVRow[] = rows.map((row, index) => ({
				name: nameIndex >= 0 ? row[nameIndex] || "" : "",
				email: emailIndex >= 0 ? row[emailIndex] || "" : "",
				rowIndex: index + 1,
			}));

			setCsvData(mappedData);
			setIsProcessing(false);
		};

		reader.readAsText(file);
	};

	// Handle import
	const handleImport = async () => {
		if (validateData.errors.length === 0 && csvData.length > 0) {
			try {
				const validData = csvData.filter(
					(row) => row.email && emailRegex.test(row.email),
				);

				const result = await bulkInsertionHook.mutateAsync({
					eventId,
					participants: validData.map((row) => ({
						name: row.name,
						email: row.email,
					})),
				});

				if (result.success) {
					// Use centralized invalidation helper for participants
					invalidateEntityQueries.participants(queryClient, eventId);

					// Show confetti
					setShowConfetti(true);
					setTimeout(() => setShowConfetti(false), 5000);

					// Show success toast
					toast.success(
						`Successfully imported ${result.processed} participants.`,
					);

					// Call completion callback
					onImportComplete?.(result.processed);

					// Close dialog
					handleClose();
				} else {
					toast.error("Import failed. Please check the data and try again.");
				}
			} catch (error) {
				console.error("Import error:", error);
				toast.error(
					"An error occurred while importing data. Please try again.",
				);
			}
		}
	};

	// Handle close
	const handleClose = () => {
		setCsvData([]);
		setRawHeaders([]);
		setFileName("");
		setIsOpen(false);
	};

	const validRowsCount =
		csvData.length -
		validateData.errors.filter((e) => e.field !== "structure").length;
	const hasStructureErrors = validateData.errors.some(
		(e) => e.field === "structure",
	);

	return (
		<>
			{/* Confetti */}
			{showConfetti && (
				<Confetti
					width={width}
					height={height}
					recycle={false}
					numberOfPieces={200}
					gravity={0.3}
				/>
			)}

			{/* Main Trigger Button */}
			<Button onClick={() => setIsOpen(true)} className="gap-2">
				<Upload className="h-4 w-4" />
				Import CSV
			</Button>

			{/* Import Dialog */}
			<Dialog open={isOpen} onOpenChange={handleClose}>
				<DialogContent className="flex max-h-[80vh] max-w-4xl flex-col">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							Import CSV Data
						</DialogTitle>
					</DialogHeader>

					<div className="flex-1 space-y-4 overflow-hidden">
						{/* Upload Area */}
						{csvData.length === 0 && (
							<div
								className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${isDragOver
										? "border-primary bg-primary/5"
										: "border-muted-foreground/25 hover:border-muted-foreground/50"
									}`}
								onDrop={handleDrop}
								onDragOver={(e) => {
									e.preventDefault();
									setIsDragOver(true);
								}}
								onDragLeave={() => setIsDragOver(false)}
							>
								{isProcessing ? (
									<Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-muted-foreground" />
								) : (
									<Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
								)}
								<h3 className="mb-2 font-semibold text-lg">
									{isProcessing ? "Processing..." : "Drop your CSV file here"}
								</h3>
								<p className="mb-4 text-muted-foreground">
									or click to browse files
								</p>
								<input
									type="file"
									accept=".csv"
									onChange={handleFileInput}
									className="hidden"
									id="csv-upload"
									disabled={isProcessing}
								/>
								<Button asChild variant="outline" disabled={isProcessing}>
									<label htmlFor="csv-upload" className="cursor-pointer">
										Choose File
									</label>
								</Button>
							</div>
						)}

						{/* File Info and Validation */}
						{csvData.length > 0 && (
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<FileText className="h-4 w-4" />
										<span className="font-medium">{fileName}</span>
										<Badge variant="secondary">{csvData.length} rows</Badge>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											setCsvData([]);
											setRawHeaders([]);
											setFileName("");
										}}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>

								{/* Validation Summary */}
								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<Alert
										className={
											hasStructureErrors
												? "border-destructive"
												: "border-green-500"
										}
									>
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											<strong>Structure:</strong>{" "}
											{hasStructureErrors ? "Invalid" : "Valid"}
											<br />
											Required columns: name, email
										</AlertDescription>
									</Alert>

									<Alert
										className={
											validateData.errors.length > 0
												? "border-destructive"
												: "border-green-500"
										}
									>
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											<strong>Validation:</strong> {validateData.errors.length}{" "}
											errors
											<br />
											{validRowsCount} valid rows
										</AlertDescription>
									</Alert>

									<Alert className="border-amber-500">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											<strong>Note:</strong> Emails already registered will be
											updated with new information.
										</AlertDescription>
									</Alert>
								</div>

								{/* Errors Display */}
								{validateData.errors.length > 0 && (
									<Alert variant="destructive">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											<strong>
												Validation Errors ({validateData.errors.length}):
											</strong>
											<ScrollArea className="mt-2 h-32">
												<ul className="space-y-1 pr-4">
													{validateData.errors.map((error, index) => (
														<li key={index} className="text-sm">
															{error.field === "structure"
																? error.message
																: `Row ${error.row}: ${error.message} (${error.field})`}
														</li>
													))}
												</ul>
											</ScrollArea>
										</AlertDescription>
									</Alert>
								)}

								{/* Duplicate Emails Warning */}
								{validateData.duplicateEmails.length > 0 && (
									<Alert variant="destructive">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											<strong>
												Duplicate Emails Found (
												{validateData.duplicateEmails.length}):
											</strong>
											<ScrollArea className="mt-2 h-20">
												<div className="flex flex-wrap gap-1 pr-4">
													{validateData.duplicateEmails.map((email, index) => (
														<Badge
															key={index}
															variant="destructive"
															className="text-xs"
														>
															{email}
														</Badge>
													))}
												</div>
											</ScrollArea>
										</AlertDescription>
									</Alert>
								)}

								{/* CSV Preview */}
								<div className="rounded-lg border">
									<div className="border-b bg-muted/50 p-3">
										<h4 className="font-medium">Data Preview</h4>
									</div>
									<ScrollArea className="h-80">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className="w-16">#</TableHead>
													<TableHead>Name</TableHead>
													<TableHead>Email</TableHead>
													<TableHead className="w-20">Status</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{csvData.map((row, index) => {
													const rowErrors = validateData.errors.filter(
														(e) => e.row === index + 1,
													);
													const hasError = rowErrors.length > 0;
													return (
														<TableRow
															key={index}
															className={hasError ? "bg-destructive/5" : ""}
														>
															<TableCell className="font-mono text-sm">
																{index + 1}
															</TableCell>
															<TableCell>
																{row.name || (
																	<span className="text-muted-foreground italic">
																		empty
																	</span>
																)}
															</TableCell>
															<TableCell
																className={
																	rowErrors.some((e) => e.field === "email")
																		? "text-destructive"
																		: ""
																}
															>
																{row.email}
															</TableCell>
															<TableCell>
																{hasError ? (
																	<Badge
																		variant="destructive"
																		className="text-xs"
																	>
																		Error
																	</Badge>
																) : (
																	<Badge
																		variant="secondary"
																		className="text-xs"
																	>
																		<CheckCircle className="mr-1 h-3 w-3" />
																		Valid
																	</Badge>
																)}
															</TableCell>
														</TableRow>
													);
												})}
											</TableBody>
										</Table>
									</ScrollArea>
								</div>
							</div>
						)}
					</div>

					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={handleClose}>
							Cancel
						</Button>
						{csvData.length > 0 && (
							<Button
								onClick={handleImport}
								disabled={
									validateData.errors.length > 0 ||
									csvData.length === 0 ||
									bulkInsertionHook.isPending
								}
								className="gap-2"
							>
								{bulkInsertionHook.isPending ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Importing...
									</>
								) : (
									<>
										<Upload className="h-4 w-4" />
										Import {validRowsCount} Valid Records
									</>
								)}
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
