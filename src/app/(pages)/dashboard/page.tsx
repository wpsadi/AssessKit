"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { Plus } from "lucide-react";
import { CreateEventDialog } from "./_components/create-event-dialog";
import { EventCard } from "./_components/event-card";
import { UserNav } from "./_components/user-nav";

export default function DashboardPage() {
	const {
		data: events,
		isLoading,
		error,
		refetch,
	} = api.events.getEvents.useQuery(undefined, {
		refetchInterval: 30000, // Refetch every 30 seconds
		refetchOnWindowFocus: true,
		retry: 0,
	});

	const user = api.user.getUser.useQuery(undefined, {
		refetchInterval: 1000 * 10,
		retry: 0,
	});

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<header className="border-border border-b bg-card shadow-sm">
					<div className="container mx-auto flex items-center justify-between px-4 py-4">
						<h1 className="font-bold text-2xl">AssessKit Platform</h1>
						<UserNav />
					</div>
				</header>
				<main className="container mx-auto px-4 py-8">
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
							<p className="mt-4 text-muted-foreground">Loading events...</p>
						</div>
					</div>
				</main>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-background">
				<header className="border-border border-b bg-card shadow-sm">
					<div className="container mx-auto flex items-center justify-between px-4 py-4">
						<h1 className="font-bold text-2xl">AssessKit Platform</h1>
						<UserNav />
					</div>
				</header>
				<main className="container mx-auto px-4 py-8">
					<div className="container mx-auto py-8">
						<div className="text-center">
							<h1 className="font-bold text-2xl text-destructive">Error</h1>
							<p className="mt-2 text-muted-foreground">
								{error.message || "Failed to load events"}
							</p>
							<Button
								onClick={() => refetch()}
								variant="outline"
								className="mt-4"
							>
								Retry
							</Button>
						</div>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<header className="border-border border-b bg-card shadow-sm">
				<div className="container mx-auto flex items-center justify-between px-4 py-4">
					<h1 className="font-bold text-2xl">AssessKit Platform</h1>
					<UserNav />
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				{/* <MockModeBanner /> */}

				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="font-bold text-3xl">
							Welcome back,{" "}
							{user.data?.data.user?.user_metadata.name ||
								user.data?.data.user?.email}
						</h2>
						<p className="mt-2 text-muted-foreground">
							Manage your quiz events and track participant progress
						</p>
					</div>
					<CreateEventDialog>
						<Button size="lg">
							<Plus className=" h-4 w-4" />
							<span className="hidden md:mr-2 md:inline">Create Event</span>
						</Button>
					</CreateEventDialog>
				</div>

				{!events || events.length === 0 ? (
					<div className="py-12 text-center">
						<div className="mx-auto max-w-md">
							<h3 className="mb-2 font-semibold text-xl">No events yet</h3>
							<p className="mb-6 text-muted-foreground">
								Create your first quiz event to get started with organizing
								quizzes and managing participants.
							</p>
							<CreateEventDialog>
								<Button size="lg">
									<Plus className="mr-2 h-4 w-4" />
									Create Your First Event
								</Button>
							</CreateEventDialog>
						</div>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{events.map((event) => (
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
						))}
					</div>
				)}
			</main>
		</div>
	);
}
