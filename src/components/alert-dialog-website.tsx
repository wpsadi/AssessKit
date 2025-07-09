"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

export function WebsiteNoticeDialog() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		// Show dialog on first visit or if user hasn't seen it recently
		const hasSeenNotice = localStorage.getItem("website-notice-seen");
		if (!hasSeenNotice) {
			setOpen(true);
		}
	}, []);

	const handleClose = () => {
		setOpen(false);
		localStorage.setItem("website-notice-seen", "true");
	};

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogContent className="max-w-md">
				<AlertDialogHeader>
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-amber-500" />
						<AlertDialogTitle>Website Notice</AlertDialogTitle>
					</div>
					<AlertDialogDescription className="space-y-2 text-left">
						<p>
							This website is very simple and may require manual page refreshes
							in many places to see updated data.
						</p>
						<p className="text-muted-foreground text-sm">
							Please refresh your browser if you don't see the latest
							information.
						</p>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogAction onClick={handleClose}>Got it</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
