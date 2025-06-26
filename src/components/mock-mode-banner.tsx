"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function MockModeBanner() {
	return (
		<Alert className="mb-4 border-blue-200 bg-blue-50">
			<Info className="h-4 w-4 text-blue-600" />
			<AlertDescription className="text-blue-700">
				<strong>Demo Mode:</strong> This application is running with mock data.
				All changes are temporary and will reset on page refresh.
			</AlertDescription>
		</Alert>
	);
}
