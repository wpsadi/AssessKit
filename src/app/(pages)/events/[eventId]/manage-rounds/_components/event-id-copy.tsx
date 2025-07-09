"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function EventIdCopy() {
	const params = useParams();
	const eventId = params.eventId as string;
	const [copied, setCopied] = useState(false);

	const copyToClipboard = async () => {
		if (!eventId) return;

		try {
			await navigator.clipboard.writeText(eventId);
			setCopied(true);
			toast.success("Event ID copied to clipboard!");

			// Reset the copied state after 2 seconds
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			toast.error("Failed to copy to clipboard");
		}
	};

	if (!eventId) {
		return (
			<Card className="mb-2 w-full">
				<CardContent className="p-1">
					<p className="text-muted-foreground">No event ID found in URL</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="mb-2 w-full">
			<CardContent className="p-1">
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0 flex-1">
						<p className="mb-1 font-medium text-muted-foreground text-sm">
							Event ID
						</p>
						<p className="truncate font-mono text-sm" title={eventId}>
							{eventId}
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={copyToClipboard}
						className="shrink-0 bg-transparent"
					>
						{copied ? (
							<Check className="h-4 w-4 text-green-600" />
						) : (
							<Copy className="h-4 w-4" />
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
