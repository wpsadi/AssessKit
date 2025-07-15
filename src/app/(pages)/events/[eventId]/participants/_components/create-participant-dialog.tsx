"use client";

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
import { api } from "@/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntityQueries } from "@/lib/query-keys";
import { AlertTriangle } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface CreateParticipantDialogProps {
	eventId: string;
	children: React.ReactNode;
	onSuccess?: () => void;
}

export function CreateParticipantDialog({
	eventId,
	children,
	onSuccess,
}: CreateParticipantDialogProps) {
	const utils = api.useUtils();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const queryClient = useQueryClient();

	const createParticipantMutation = api.participants.create.useMutation({
		onSuccess: () => {
			// Use centralized invalidation helper for participants
			utils.participants.getByEvent.invalidate({ eventId });
			setOpen(false);
			resetForm();
			onSuccess?.();
		},
		onError: (error) => {
			setError(error.message);
			setIsSubmitting(false);
		},
	});

	const resetForm = () => {
		setName("");
		setEmail("");
		setError("");
		setIsSubmitting(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError("");

		try {
			await createParticipantMutation.mutateAsync({
				eventId,
				name,
				email,
			});
		} catch (error) {
			// Error is handled by onError callback
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[400px]">
				<DialogHeader>
					<DialogTitle>Add New Participant</DialogTitle>
					<DialogDescription>
						Add a new participant to this quiz event.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<div className="space-y-2">
						<Label htmlFor="name">Full Name *</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter participant's full name"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="email">Email Address *</Label>
						<Input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Enter participant's email"
							required
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting || !name.trim() || !email.trim()}
						>
							{isSubmitting ? "Adding..." : "Add Participant"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// export function CreateParticipantDialog({ eventId, children }: CreateParticipantDialogProps) {
//   const [open, setOpen] = useState(false)
//   const [isLoading, setIsLoading] = useState(false)
//   const router = useRouter()

//   const handleSubmit = async (formData: FormData) => {
//     setIsLoading(true)
//     try {
//       const result = await createParticipant(eventId, formData)
//       if (result.error) {
//         console.error("Error creating participant:", result.error)
//         alert(result.error) // In a real app, use proper error handling
//       } else {
//         setOpen(false)
//         router.refresh()
//       }
//     } catch (error) {
//       console.error("Error creating participant:", error)
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>{children}</DialogTrigger>
//       <DialogContent className="sm:max-w-[425px]">
//         <form action={handleSubmit}>
//           <DialogHeader>
//             <DialogTitle>Add New Participant</DialogTitle>
//             <DialogDescription>
//               Add a new participant to this quiz event. They will receive login credentials to access the quiz.
//             </DialogDescription>
//           </DialogHeader>

//           <div className="grid gap-4 py-4">
//             <div className="grid gap-2">
//               <Label htmlFor="name">Full Name</Label>
//               <Input id="name" name="name" placeholder="Enter participant's full name" required />
//             </div>

//             <div className="grid gap-2">
//               <Label htmlFor="email">Email Address</Label>
//               <Input id="email" name="email" type="email" placeholder="Enter participant's email" required />
//             </div>
//           </div>

//           <DialogFooter>
//             <Button type="button" variant="outline" onClick={() => setOpen(false)}>
//               Cancel
//             </Button>
//             <Button type="submit" disabled={isLoading}>
//               {isLoading ? "Adding..." : "Add Participant"}
//             </Button>
//           </DialogFooter>
//         </form>
//       </DialogContent>
//     </Dialog>
//   )
// }
