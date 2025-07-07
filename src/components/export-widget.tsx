"use client";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/trpc/react";
import { Download, FileText, Loader2, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface ExportWidgetProps {
	eventId: string;
	eventName?: string;
}

interface ParticipantData {
	id: string;
	name: string;
	email: string;
	password: string | null;
}

export default function ExportWidget({ eventName = "." }: ExportWidgetProps) {
	const [isOpen, setIsOpen] = useState(false);
	const { eventId } = useParams<{ eventId: string }>();
	const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
	const [isExporting, setIsExporting] = useState(false);

	// Get participants data
	const { data: participants, isLoading } =
		api.participants.getWithPasswordsByEvent.useQuery(
			{ eventId },
			{ enabled: isOpen },
		);

	// Convert data to CSV format
	const convertToCSV = (data: ParticipantData[]): string => {
		if (data.length === 0) return "name,email,password\n";

		const headers = ["name", "email", "password"];
		const csvContent = [
			headers.join(","),
			...data.map((participant) =>
				[
					`"${participant.name.replace(/"/g, '""')}"`,
					`"${participant.email}"`,
					`"${participant.password || ""}"`,
				].join(","),
			),
		].join("\n");

		return csvContent;
	};

	// Convert data to JSON format
	const convertToJSON = (data: ParticipantData[]): string => {
		const jsonData = {
			event: {
				id: eventId,
				name: eventName,
				exportedAt: new Date().toISOString(),
				totalParticipants: data.length,
			},
			participants: data.map((participant) => ({
				id: participant.id,
				name: participant.name,
				email: participant.email,
				password: participant.password,
			})),
		};

		return JSON.stringify(jsonData, null, 2);
	};

	// Download file
	const downloadFile = (
		content: string,
		filename: string,
		mimeType: string,
	) => {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// Handle export
	const handleExport = async () => {
		if (!participants || participants.length === 0) {
			toast.info("No participants found for export.", {
				description:
					"Please make sure there are participants in the event before exporting.",
			});
			return;
		}

		setIsExporting(true);

		try {
			const timestamp = new Date().toISOString().split("T")[0];
			const sanitizedEventName = eventName
				.replace(/[^a-zA-Z0-9]/g, "_")
				.toLowerCase();

			if (exportFormat === "csv") {
				const csvContent = convertToCSV(participants);
				const filename = `${sanitizedEventName}_participants_${timestamp}.csv`;
				downloadFile(csvContent, filename, "text/csv");

				toast.success(`Downloaded ${participants.length} participants as CSV.`);
			} else {
				const jsonContent = convertToJSON(participants);
				const filename = `${sanitizedEventName}_participants_${timestamp}.json`;
				downloadFile(jsonContent, filename, "application/json");

				toast.success(
					`Downloaded ${participants.length} participants as JSON.`,
				);
			}

			setIsOpen(false);
		} catch (error) {
			console.error("Export error:", error);
			toast.error(
				"Failed to export participants data. Please try again later.",
			);
		} finally {
			setIsExporting(false);
		}
	};

	const participantCount = participants?.length || 0;

	return (
		<>
			{/* Main Trigger Button */}
			<Button
				onClick={() => setIsOpen(true)}
				variant="outline"
				className="gap-2"
			>
				<Download className="h-4 w-4" />
				Export Data
			</Button>

			{/* Export Dialog */}
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Download className="h-5 w-5" />
							Export Participants
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-6">
						{/* Event Info */}
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">{eventName}</CardTitle>
								<CardDescription className="flex items-center gap-2">
									<Users className="h-4 w-4" />
									{isLoading ? (
										<span className="flex items-center gap-2">
											<Loader2 className="h-3 w-3 animate-spin" />
											Loading participants...
										</span>
									) : (
										<span>{participantCount} participants</span>
									)}
								</CardDescription>
							</CardHeader>
						</Card>

						{/* Format Selection */}
						<div className="space-y-4">
							<Label className="font-medium text-base">Export Format</Label>

							<div className="grid grid-cols-2 gap-4">
								{/* CSV Option */}
								<Card
									className={`cursor-pointer transition-all ${
										exportFormat === "csv"
											? "bg-primary/5 ring-2 ring-primary"
											: "hover:bg-muted/50"
									}`}
									onClick={() => setExportFormat("csv")}
								>
									<CardContent className="p-4 text-center">
										<FileText className="mx-auto mb-2 h-8 w-8" />
										<div className="font-medium">CSV</div>
										<div className="mt-1 text-muted-foreground text-xs">
											Spreadsheet format
										</div>
									</CardContent>
								</Card>

								{/* JSON Option */}
								<Card
									className={`cursor-pointer transition-all ${
										exportFormat === "json"
											? "bg-primary/5 ring-2 ring-primary"
											: "hover:bg-muted/50"
									}`}
									onClick={() => setExportFormat("json")}
								>
									<CardContent className="p-4 text-center">
										<FileText className="mx-auto mb-2 h-8 w-8" />
										<div className="font-medium">JSON</div>
										<div className="mt-1 text-muted-foreground text-xs">
											Structured data
										</div>
									</CardContent>
								</Card>
							</div>

							{/* Format Toggle Switch */}
							<div className="flex items-center justify-between rounded-lg border p-3">
								<div className="space-y-0.5">
									<Label className="font-medium text-sm">
										{exportFormat === "csv" ? "CSV Format" : "JSON Format"}
									</Label>
									<div className="text-muted-foreground text-xs">
										{exportFormat === "csv"
											? "Export as comma-separated values for spreadsheets"
											: "Export as structured JSON with metadata"}
									</div>
								</div>
								<Switch
									checked={exportFormat === "json"}
									onCheckedChange={(checked) =>
										setExportFormat(checked ? "json" : "csv")
									}
								/>
							</div>
						</div>

						{/* Preview Info */}
						{!isLoading && participantCount > 0 && (
							<div className="rounded-lg bg-muted/50 p-3">
								<div className="mb-2 font-medium text-sm">Export Preview</div>
								<div className="space-y-1 text-muted-foreground text-xs">
									<div>• {participantCount} participants will be exported</div>
									<div>• Includes: name, email, password</div>
									{exportFormat === "json" && (
										<div>• Additional metadata and event information</div>
									)}
								</div>
							</div>
						)}
					</div>

					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => setIsOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleExport}
							disabled={isLoading || participantCount === 0 || isExporting}
							className="gap-2"
						>
							{isExporting ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Exporting...
								</>
							) : (
								<>
									<Download className="h-4 w-4" />
									Export {exportFormat.toUpperCase()}
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
