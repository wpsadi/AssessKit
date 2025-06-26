"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Participant } from "@/lib/types";
import { Mail, MoreHorizontal, Search, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DeleteParticipantDialog } from "./delete-participant-dialog";
import { EditParticipantDialog } from "./edit-participant-dialog";

interface ParticipantsListProps {
	participants: Participant[];
	eventId: string;
}

export function ParticipantsList({
	participants,
	eventId,
}: ParticipantsListProps) {
	const [searchTerm, setSearchTerm] = useState("");

	const filteredParticipants = participants.filter(
		(participant) =>
			participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			participant.email.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<div className="relative max-w-sm flex-1">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400" />
					<Input
						placeholder="Search participants..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-10"
					/>
				</div>
				<div className="text-gray-600 text-sm">
					{filteredParticipants.length} of {participants.length} participants
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{filteredParticipants.map((participant) => (
					<Card
						key={participant.id}
						className="transition-shadow hover:shadow-md"
					>
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
										<User className="h-5 w-5 text-blue-600" />
									</div>
									<div>
										<CardTitle className="text-lg">
											{participant.name}
										</CardTitle>
										<div className="mt-1 flex items-center gap-1 text-gray-600 text-sm">
											<Mail className="h-3 w-3" />
											{participant.email}
										</div>
									</div>
								</div>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="sm">
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<Link
											href={`/events/${eventId}/participants/${participant.id}/answers`}
										>
											<DropdownMenuItem>View Answers</DropdownMenuItem>
										</Link>
										<EditParticipantDialog participant={participant}>
											<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
												Edit Participant
											</DropdownMenuItem>
										</EditParticipantDialog>
										<DeleteParticipantDialog participant={participant}>
											<DropdownMenuItem
												onSelect={(e) => e.preventDefault()}
												className="text-red-600"
											>
												Delete Participant
											</DropdownMenuItem>
										</DeleteParticipantDialog>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</CardHeader>

						<CardContent>
							<div className="flex items-center justify-between">
								<Badge variant={participant.isActive ? "default" : "secondary"}>
									{participant.isActive ? "Active" : "Inactive"}
								</Badge>
								<div className="text-gray-500 text-xs">
									Added{" "}
									{participant.createdAt
										? new Date(participant.createdAt).toLocaleDateString()
										: "Unknown date"}
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{filteredParticipants.length === 0 && searchTerm && (
				<div className="py-8 text-center">
					<p className="text-gray-600">
						No participants found matching "{searchTerm}"
					</p>
				</div>
			)}
		</div>
	);
}
