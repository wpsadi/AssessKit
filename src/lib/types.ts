export interface Event {
	id: string;
	title: string;
	description?: string | null;
	startDate?: Date | null;
	endDate?: Date | null;
	durationMinutes?: number;
	isActive?: boolean;
	organizerId?: string;
	orderIndex?: number;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface Round {
	id: string;
	title: string;
	description?: string | null;
	timeLimit?: number | null;
	useEventDuration?: boolean;
	isActive?: boolean;
	orderIndex?: number;
	eventId: string;
	createdAt?: Date;
	updatedAt?: Date;
	questionCount?: number;
}

export interface Participant {
	id: string;
	name: string;
	email: string;
	isActive?: boolean;
	orderIndex?: number;
	eventId: string;
	userId?: string | null;
	password?: string | null;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface Question {
	id: string;
	questionId: string;
	answerIds: string[];
	positivePoints: number;
	negativePoints: number;
	timeLimit?: number | null;
	useRoundDefault: boolean;
	orderIndex: number;
	roundId: string;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface Response {
	id: string;
	submittedAnswer: string;
	isCorrect: boolean;
	pointsEarned: number;
	timeTaken?: number | null;
	submittedAt?: Date | null;
	participantId: string;
	questionId: string;
	roundId: string;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface Score {
	id: string;
	totalPoints?: number;
	totalQuestions?: number;
	correctAnswers?: number;
	completionTime?: number | null;
	completedAt?: Date | null;
	participantId: string;
	roundId: string;
	eventId: string;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface LeaderboardEntry {
	participant: Participant;
	totalPoints?: string | number | null;
	totalQuestions?: string | number | null;
	correctAnswers?: string | number | null;
	completionTime?: string | number | null;
	rank: number;
	accuracyRate: number;
	score?: {
		totalPoints: number;
		totalQuestions: number;
		correctAnswers: number;
		completionTime: number | null;
		completedAt: string | null;
	};
}

export interface LeaderboardStats {
	totalParticipants: number;
	averageScore: string | number | null;
	highestScore: string | number | null;
	totalResponses: number;
	completionRate?: number;
}

export interface ParticipantSession {
	id: string;
	participantId: string;
	eventId: string;
	roundId: string;
	currentQuestionId?: string | null;
	questionStartedAt?: Date | null;
	isOnQuestion: boolean;
	totalQuestionsAnswered: number;
	sessionStartedAt: Date;
	lastActivityAt: Date;
	isCompleted: boolean;
	createdAt?: Date;
	updatedAt?: Date;
}
