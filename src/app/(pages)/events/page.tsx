import { api } from "@/trpc/server";
import { redirect } from "next/navigation";
import { EventCard } from "../dashboard/_components/event-card";

export default async function HomePage({
	params,
}: {
	params: Promise<{ eventId: string }>;
}) {

	const { eventId } = await params;

	if (!eventId) {
		return redirect("/dashboard");
	}

	const isAdmin = await api.user.isAdmin();

	if (!isAdmin) {
		redirect(`/events/${eventId}`);
	}

	const event = await api.events.getEvent({
		id: eventId,
	})

	return (<>
		<EventCard
			key={event.id}
			event={{
				id: event.id,
				title: event.title,
				description: event.description,
				start_date: event.startDate
					? event.startDate.toISOString()
					: null,
				end_date: event.endDate ? event.endDate.toISOString() : null,
				is_active: event.isActive ?? false,
			}}
			participantCount={event.participantCount || 0}
		/>
	</>)
}
