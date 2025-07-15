"use client";

// import type React from "react"
// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Alert, AlertDescription } from "@/components/ui/alert"
// import { api } from "@/trpc/react"
// import { AlertTriangle } from "lucide-react"
// import type { Participant } from "@/lib/types"

interface EditParticipantDialogProps {
	participant: Participant;
	children: React.ReactNode;
	onSuccess?: () => void;
}

// export function EditParticipantDialog({ participant, children, onSuccess }: EditParticipantDialogProps) {
//   const [open, setOpen] = useState(false)
//   const [name, setName] = useState(participant.name)
//   const [email, setEmail] = useState(participant.email)
//   const [isSubmitting, setIsSubmitting] = useState(false)
//   const [error, setError] = useState("")

//   const updateParticipantMutation = api.participants.update.useMutation({
//     onSuccess: () => {
//       setOpen(false)
//       setError("")
//       setIsSubmitting(false)
//       onSuccess?.()
//     },
//     onError: (error) => {
//       setError(error.message)
//       setIsSubmitting(false)
//     },
//   })

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setIsSubmitting(true)
//     setError("")

//     try {
//       await updateParticipantMutation.mutateAsync({
//         id: participant.id,
//         name,
//         email,
//       })
//     } catch (error) {
//       // Error is handled by onError callback
//     }
//   }

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>{children}</DialogTrigger>
//       <DialogContent className="sm:max-w-[400px]">
//         <DialogHeader>
//           <DialogTitle>Edit Participant</DialogTitle>
//           <DialogDescription>
//             Update participant information.
//           </DialogDescription>
//         </DialogHeader>

//         <form onSubmit={handleSubmit} className="space-y-4">
//           {error && (
//             <Alert variant="destructive">
//               <AlertTriangle className="h-4 w-4" />
//               <AlertDescription>{error}</AlertDescription>
//             </Alert>
//           )}

//           <div className="space-y-2">
//             <Label htmlFor="name">Full Name *</Label>
//             <Input
//               id="name"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               placeholder="Enter participant's full name"
//               required
//             />
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="email">Email Address *</Label>
//             <Input
//               id="email"
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="Enter participant's email"
//               required
//             />
//           </div>

//           <DialogFooter>
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() => setOpen(false)}
//               disabled={isSubmitting}
//             >
//               Cancel
//             </Button>
//             <Button type="submit" disabled={isSubmitting || !name.trim() || !email.trim()}>
//               {isSubmitting ? "Updating..." : "Update Participant"}
//             </Button>
//           </DialogFooter>
//         </form>
//       </DialogContent>
//     </Dialog>
//   )
// }

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
import { Switch } from "@/components/ui/switch";
import type { Participant } from "@/lib/types";
import { api } from "@/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntityQueries } from "@/lib/query-keys";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface EditParticipantDialogProps {
	participant: Participant;
	children: React.ReactNode;
}

export function EditParticipantDialog({
	participant,
	children,
}: EditParticipantDialogProps) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(participant.name);
	const [email, setEmail] = useState(participant.email);
	const [isActive, setIsActive] = useState(participant.isActive);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const utils = api.useUtils();

	const updateParticipant = api.participants.update.useMutation({
		onSuccess: () => {
			// Use centralized invalidation helper for participants
			utils.participants.getByEvent.invalidate({
				eventId: participant.eventId,
			});
			setOpen(false);
			setError(null);
			router.refresh();
		},
		onError: (err) => {
			setError(
				(err as unknown as Error).message || "Failed to update participant.",
			);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		updateParticipant.mutate({
			id: participant.id,
			name,
			email,
			isActive,
		});
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Edit Participant</DialogTitle>
						<DialogDescription>
							Update the participant's information and access status.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{error && <div className="text-red-500 text-sm">{error}</div>}
						<div className="grid gap-2">
							<Label htmlFor="name">Full Name</Label>
							<Input
								id="name"
								name="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="email">Email Address</Label>
							<Input
								id="email"
								name="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label htmlFor="isActive">Active Status</Label>
								<div className="text-gray-600 text-sm">
									{isActive
										? "Participant can access the quiz"
										: "Participant access is disabled"}
								</div>
							</div>
							<Switch
								id="isActive"
								checked={isActive}
								onCheckedChange={setIsActive}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={updateParticipant.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={updateParticipant.isPending}>
							{updateParticipant.isPending
								? "Updating..."
								: "Update Participant"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
