import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { BarChart3, Calendar, Settings, Users } from "lucide-react";
import Link from "next/link";
import { DeleteEventDialog } from "./delete-event-dialog";
import { EditEventDialog } from "./edit-event-dialog";

interface EventCardProps {
	event: {
		id: string;
		title: string;
		description?: string | null;
		start_date: string | null; // ISO date string
		end_date: string | null; // ISO date string
		is_active: boolean; // true if the event is currently active
	};
	participantCount?: number; // optional count for future use
}

export function EventCard({ event, participantCount = 0 }: EventCardProps) {
	const formatDate = (dateString: string | null) => {
		if (!dateString) return "Not set";
		return new Date(dateString).toLocaleDateString();
	};

	return (
		<Card className="transition-shadow hover:shadow-lg">
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<CardTitle className="mb-2 text-xl">{event.title}</CardTitle>
						<CardDescription className="line-clamp-2">
							{event.description || "No description provided"}
						</CardDescription>
					</div>
					<Badge variant={event.is_active ? "default" : "secondary"}>
						{event.is_active ? "Active" : "Inactive"}
					</Badge>
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				<div className="flex items-center text-gray-600 text-sm">
					<Calendar className="mr-2 h-4 w-4" />
					<span>
						{formatDate(event.start_date)} - {formatDate(event.end_date)}
					</span>
				</div>

				<div className="flex items-center text-gray-600 text-sm">
					<Users className="mr-2 h-4 w-4" />
					<span>Participants: {participantCount}</span>
				</div>
			</CardContent>

			<CardFooter className="flex flex-wrap gap-2">
				<Link href={`/events/${event.id}/manage-rounds`}>
					<Button variant="outline" size="sm">
						<Settings className="mr-2 h-4 w-4" />
						Manage Rounds
					</Button>
				</Link>

				<Link href={`/events/${event.id}/participants`}>
					<Button variant="outline" size="sm">
						<Users className="mr-2 h-4 w-4" />
						Participants
					</Button>
				</Link>

				<Link href={`/events/${event.id}/leaderboard`}>
					<Button variant="outline" size="sm">
						<BarChart3 className="mr-2 h-4 w-4" />
						Leaderboard
					</Button>
				</Link>

				<div className="ml-auto flex gap-2">
					<EditEventDialog
						event={{
							id: event.id,
							title: event.title,
							description: event.description || "",
							start_date: event.start_date || "",
							end_date: event.end_date || "",
						}}
					>
						<Button variant="ghost" size="sm">
							Edit
						</Button>
					</EditEventDialog>

					<DeleteEventDialog event={event}>
						<Button
							variant="ghost"
							size="sm"
							className="text-red-600 hover:text-red-700"
						>
							Delete
						</Button>
					</DeleteEventDialog>
				</div>
			</CardFooter>
		</Card>
	);
}
