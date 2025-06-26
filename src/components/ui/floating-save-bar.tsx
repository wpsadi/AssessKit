"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Save, X } from "lucide-react";

interface FloatingSaveBarProps {
	onSave: () => void;
	onDiscard: () => void;
	isSaving?: boolean;
}

export function FloatingSaveBar({
	onSave,
	onDiscard,
	isSaving = false,
}: FloatingSaveBarProps) {
	return (
		<div className="-translate-x-1/2 fixed bottom-6 left-1/2 z-50 transform">
			<Card className="border p-4 shadow-lg">
				<div className="flex items-center gap-4">
					<span className="font-medium text-sm">You have unsaved changes</span>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={onDiscard}
							disabled={isSaving}
						>
							<X className="mr-2 h-4 w-4" />
							Discard
						</Button>
						<Button size="sm" onClick={onSave} disabled={isSaving}>
							<Save className="mr-2 h-4 w-4" />
							{isSaving ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</div>
			</Card>
		</div>
	);
}
