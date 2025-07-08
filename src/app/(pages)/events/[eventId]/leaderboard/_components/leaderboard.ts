import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { participants, responses, rounds, scores, participantSessions, events, questions } from "@/server/db/schema"
import { asc, avg, count, countDistinct, desc, eq, max, sql, sum, and } from "drizzle-orm"
import { z } from "zod"

export const leaderboardRouter = createTRPCRouter({
  // GET - Event leaderboard (aggregated across all rounds)
  getEventLeaderboard: publicProcedure.input(z.object({ eventId: z.string() })).query(async ({ ctx, input }) => {
    // Get aggregated scores from the scores table for better accuracy
    const eventScores = await ctx.db
      .select({
        participant: participants,
        totalPoints: sum(scores.totalPoints),
        totalQuestions: sum(scores.totalQuestions),
        correctAnswers: sum(scores.correctAnswers),
        totalCompletionTime: sum(scores.completionTime),
        roundsCompleted: count(scores.id),
        lastCompletedAt: max(scores.completedAt),
        averageCompletionTime: avg(scores.completionTime),
        // Get session info for completion status
        sessionInfo: sql<{
          totalSessions: number
          completedSessions: number
          lastActivity: Date
        }>`(
            SELECT json_build_object(
              'totalSessions', COUNT(ps.id),
              'completedSessions', COUNT(CASE WHEN ps.is_completed = true THEN 1 END),
              'lastActivity', MAX(ps.last_activity_at)
            )
            FROM ${participantSessions} ps 
            WHERE ps.participant_id = ${participants.id} 
            AND ps.event_id = ${input.eventId}
          )`,
      })
      .from(scores)
      .innerJoin(participants, eq(scores.participantId, participants.id))
      .where(eq(scores.eventId, input.eventId))
      .groupBy(participants.id)
      .orderBy(
        desc(sum(scores.totalPoints)), // Primary: Total points across all rounds
        asc(sum(scores.completionTime)), // Secondary: Faster total completion time
        asc(max(scores.completedAt)), // Tertiary: Earlier final completion
      )

    // Convert and rank the results
    let currentRank = 1
    const rankedLeaderboard = eventScores.map((entry, index) => {
      const totalPoints = Number(entry.totalPoints) || 0
      const totalQuestions = Number(entry.totalQuestions) || 0
      const correctAnswers = Number(entry.correctAnswers) || 0
      const totalCompletionTime = Number(entry.totalCompletionTime) || 0
      const sessionInfo = entry.sessionInfo as any

      // Handle ranking with proper tie-breaking
      if (index > 0) {
        const prevEntry = eventScores[index - 1]
        const prevPoints = Number(prevEntry.totalPoints) || 0
        const prevTime = Number(prevEntry.totalCompletionTime) || 0

        if (totalPoints !== prevPoints || totalCompletionTime !== prevTime) {
          currentRank = index + 1
        }
      }

      // Determine completion status
      const isFullyCompleted =
        sessionInfo?.completedSessions > 0 && sessionInfo?.completedSessions === sessionInfo?.totalSessions

      return {
        participant: {
          id: entry.participant.id,
          name: entry.participant.name,
          email: entry.participant.email,
        },
        totalPoints,
        totalQuestions,
        correctAnswers,
        completionTime: totalCompletionTime,
        completedAt: entry.lastCompletedAt?.toISOString() || null,
        rank: currentRank,
        roundsCompleted: Number(entry.roundsCompleted) || 0,
        isFullyCompleted,
        accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
      }
    })

    return rankedLeaderboard
  }),

  // GET - Round leaderboard (specific round results)
  getRoundLeaderboard: publicProcedure.input(z.object({ roundId: z.string() })).query(async ({ ctx, input }) => {
    // Use scores table for round-specific leaderboard
    const roundScores = await ctx.db
      .select({
        participant: participants,
        score: scores,
        sessionInfo: sql<{
          isCompleted: boolean
          sessionStarted: Date
          lastActivity: Date
          questionsAnswered: number
        }>`(
            SELECT json_build_object(
              'isCompleted', ps.is_completed,
              'sessionStarted', ps.session_started_at,
              'lastActivity', ps.last_activity_at,
              'questionsAnswered', ps.total_questions_answered
            )
            FROM ${participantSessions} ps 
            WHERE ps.participant_id = ${participants.id} 
            AND ps.round_id = ${input.roundId}
            LIMIT 1
          )`,
      })
      .from(scores)
      .innerJoin(participants, eq(scores.participantId, participants.id))
      .where(eq(scores.roundId, input.roundId))
      .orderBy(
        desc(scores.totalPoints), // Primary: Points in this round
        asc(scores.completionTime), // Secondary: Completion time for this round
        asc(scores.completedAt), // Tertiary: Earlier completion
      )

    // Add proper ranking
    let currentRank = 1
    const rankedLeaderboard = roundScores.map((entry, index) => {
      const sessionInfo = entry.sessionInfo as any

      // Handle ranking with tie-breaking
      if (index > 0) {
        const prevEntry = roundScores[index - 1]
        if (
          entry.score.totalPoints !== prevEntry.score.totalPoints ||
          entry.score.completionTime !== prevEntry.score.completionTime
        ) {
          currentRank = index + 1
        }
      }

      return {
        participant: {
          id: entry.participant.id,
          name: entry.participant.name,
          email: entry.participant.email,
        },
        score: {
          totalPoints: entry.score.totalPoints || 0,
          totalQuestions: entry.score.totalQuestions || 0,
          correctAnswers: entry.score.correctAnswers || 0,
          completionTime: entry.score.completionTime || null,
          completedAt: entry.score.completedAt,
        },
        rank: currentRank,
        isCompleted: sessionInfo?.isCompleted || false,
        questionsAnswered: sessionInfo?.questionsAnswered || 0,
        accuracy:
          entry.score.totalQuestions > 0
            ? Math.round((entry.score.correctAnswers / entry.score.totalQuestions) * 100)
            : 0,
      }
    })

    return rankedLeaderboard
  }),

  // POST - Generate demo data for testing
  generateDemoData: publicProcedure.mutation(async ({ ctx }) => {
    const demoEventId = "demo-event-2024"

    try {
      // Clean up existing demo data
      await ctx.db.delete(participantSessions).where(eq(participantSessions.eventId, demoEventId))
      await ctx.db.delete(scores).where(eq(scores.eventId, demoEventId))
      await ctx.db.delete(responses).where(eq(responses.roundId, "demo-round-1"))
      await ctx.db.delete(responses).where(eq(responses.roundId, "demo-round-2"))
      await ctx.db.delete(responses).where(eq(responses.roundId, "demo-round-3"))
      await ctx.db.delete(questions).where(eq(questions.roundId, "demo-round-1"))
      await ctx.db.delete(questions).where(eq(questions.roundId, "demo-round-2"))
      await ctx.db.delete(questions).where(eq(questions.roundId, "demo-round-3"))
      await ctx.db.delete(participants).where(eq(participants.eventId, demoEventId))
      await ctx.db.delete(rounds).where(eq(rounds.eventId, demoEventId))
      await ctx.db.delete(events).where(eq(events.id, demoEventId))

      // Create demo event
      await ctx.db.insert(events).values({
        id: demoEventId,
        title: "Programming Championship 2024",
        description: "Annual programming competition with comprehensive leaderboard testing",
        organizerId: "demo-organizer",
        startDate: new Date("2024-01-15T10:00:00Z"),
        endDate: new Date("2024-01-15T16:00:00Z"),
        durationMinutes: 360,
        isActive: true,
        orderIndex: 1,
      })

      // Create demo rounds
      const demoRounds = [
        { id: "demo-round-1", title: "Algorithm Basics", questions: 10, timeLimit: 60 },
        { id: "demo-round-2", title: "Data Structures", questions: 8, timeLimit: 90 },
        { id: "demo-round-3", title: "System Design", questions: 6, timeLimit: 120 },
      ]

      for (const [index, round] of demoRounds.entries()) {
        await ctx.db.insert(rounds).values({
          id: round.id,
          eventId: demoEventId,
          title: round.title,
          description: `Round ${index + 1} - ${round.title}`,
          orderIndex: index + 1,
          timeLimit: round.timeLimit,
          isActive: true,
        })

        // Create questions for each round
        for (let i = 1; i <= round.questions; i++) {
          await ctx.db.insert(questions).values({
            id: `${round.id}-q${i}`,
            roundId: round.id,
            questionId: `question-${i}`,
            answerIds: ["a", "b", "c", "d"],
            positivePoints: 10,
            negativePoints: -2,
            timeLimit: 300,
            orderIndex: i,
          })
        }
      }

      // Demo participant data with realistic performance profiles
      const demoParticipants = [
        {
          id: "demo-p1",
          name: "Alice Johnson",
          email: "alice.johnson@techcorp.com",
          performance: {
            round1: { points: 95, questions: 10, correct: 9, time: 45 * 60, completed: true },
            round2: { points: 88, questions: 8, correct: 7, time: 75 * 60, completed: true },
            round3: { points: 92, questions: 6, correct: 5, time: 100 * 60, completed: true },
          },
        },
        {
          id: "demo-p2",
          name: "Emma Rodriguez",
          email: "emma.rodriguez@bigtech.com",
          performance: {
            round1: { points: 95, questions: 10, correct: 9, time: 58 * 60, completed: true },
            round2: { points: 88, questions: 8, correct: 7, time: 88 * 60, completed: true },
            round3: { points: 92, questions: 6, correct: 5, time: 115 * 60, completed: true },
          },
        },
        {
          id: "demo-p3",
          name: "Henry Park",
          email: "henry.park@agency.net",
          performance: {
            round1: { points: 100, questions: 10, correct: 10, time: 60 * 60, completed: true },
            round2: { points: 80, questions: 8, correct: 8, time: 90 * 60, completed: true },
            round3: { points: 90, questions: 6, correct: 6, time: 120 * 60, completed: true },
          },
        },
        {
          id: "demo-p4",
          name: "Bob Chen",
          email: "bob.chen@startup.io",
          performance: {
            round1: { points: 90, questions: 10, correct: 9, time: 55 * 60, completed: true },
            round2: { points: 85, questions: 8, correct: 7, time: 80 * 60, completed: true },
            round3: { points: 88, questions: 6, correct: 5, time: 110 * 60, completed: true },
          },
        },
        {
          id: "demo-p5",
          name: "Jack Miller",
          email: "jack.miller@enterprise.com",
          performance: {
            round1: { points: 70, questions: 10, correct: 7, time: 45 * 60, completed: true },
            round2: { points: 75, questions: 8, correct: 6, time: 75 * 60, completed: true },
            round3: { points: 78, questions: 6, correct: 4, time: 85 * 60, completed: true },
          },
        },
        {
          id: "demo-p6",
          name: "Carol Davis",
          email: "carol.davis@university.edu",
          performance: {
            round1: { points: 75, questions: 10, correct: 7, time: 50 * 60, completed: true },
            round2: { points: 70, questions: 8, correct: 6, time: 85 * 60, completed: true },
            round3: { points: 78, questions: 6, correct: 4, time: 95 * 60, completed: true },
          },
        },
        {
          id: "demo-p7",
          name: "David Wilson",
          email: "david.wilson@freelancer.com",
          performance: {
            round1: { points: 85, questions: 10, correct: 8, time: 48 * 60, completed: true },
            round2: { points: 80, questions: 8, correct: 6, time: 70 * 60, completed: true },
            round3: { points: 0, questions: 0, correct: 0, time: 0, completed: false },
          },
        },
        {
          id: "demo-p8",
          name: "Frank Thompson",
          email: "frank.thompson@consultant.biz",
          performance: {
            round1: { points: 45, questions: 10, correct: 4, time: 60 * 60, completed: true },
            round2: { points: 35, questions: 8, correct: 3, time: 90 * 60, completed: true },
            round3: { points: 40, questions: 6, correct: 2, time: 120 * 60, completed: true },
          },
        },
        {
          id: "demo-p9",
          name: "Grace Kim",
          email: "grace.kim@research.org",
          performance: {
            round1: { points: 80, questions: 10, correct: 8, time: 52 * 60, completed: true },
            round2: { points: 25, questions: 3, correct: 2, time: 30 * 60, completed: false },
            round3: { points: 0, questions: 0, correct: 0, time: 0, completed: false },
          },
        },
        {
          id: "demo-p10",
          name: "Ivy Zhang",
          email: "ivy.zhang@mobile.app",
          performance: {
            round1: { points: 10, questions: 2, correct: 1, time: 15 * 60, completed: false },
            round2: { points: 0, questions: 0, correct: 0, time: 0, completed: false },
            round3: { points: 0, questions: 0, correct: 0, time: 0, completed: false },
          },
        },
      ]

      // Insert participants
      for (const participant of demoParticipants) {
        await ctx.db.insert(participants).values({
          id: participant.id,
          eventId: demoEventId,
          name: participant.name,
          email: participant.email,
          isActive: true,
          orderIndex: 0,
        })
      }

      // Generate responses, scores, and sessions for each participant
      for (const participant of demoParticipants) {
        const rounds = ["round1", "round2", "round3"]
        const roundIds = ["demo-round-1", "demo-round-2", "demo-round-3"]

        for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
          const roundKey = rounds[roundIndex] as keyof typeof participant.performance
          const roundId = roundIds[roundIndex]
          const roundPerf = participant.performance[roundKey]

          // Create participant session
          await ctx.db.insert(participantSessions).values({
            id: `session-${participant.id}-${roundId}`,
            participantId: participant.id,
            eventId: demoEventId,
            roundId: roundId,
            totalQuestionsAnswered: roundPerf.questions,
            isCompleted: roundPerf.completed,
            sessionStartedAt: new Date("2024-01-15T10:00:00Z"),
            lastActivityAt: new Date("2024-01-15T10:00:00Z"),
          })

          // Generate individual responses
          for (let i = 1; i <= roundPerf.questions; i++) {
            const isCorrect = i <= roundPerf.correct
            const pointsEarned = isCorrect ? 10 : -2
            const timeTaken = Math.floor(roundPerf.time / Math.max(roundPerf.questions, 1)) + (Math.random() * 60 - 30)

            await ctx.db.insert(responses).values({
              id: `response-${participant.id}-${roundId}-${i}`,
              participantId: participant.id,
              questionId: `${roundId}-q${i}`,
              roundId: roundId,
              submittedAnswer: isCorrect ? "a" : "b",
              isCorrect: isCorrect,
              pointsEarned: pointsEarned,
              timeTaken: Math.max(10, Math.floor(timeTaken)),
              submittedAt: new Date("2024-01-15T10:00:00Z"),
            })
          }

          // Create score record (only if participant answered questions)
          if (roundPerf.questions > 0) {
            await ctx.db.insert(scores).values({
              id: `score-${participant.id}-${roundId}`,
              participantId: participant.id,
              roundId: roundId,
              eventId: demoEventId,
              totalPoints: roundPerf.points,
              totalQuestions: roundPerf.questions,
              correctAnswers: roundPerf.correct,
              completionTime: roundPerf.completed ? roundPerf.time : null,
              completedAt: roundPerf.completed ? new Date("2024-01-15T12:00:00Z") : null,
            })
          }
        }
      }

      return {
        success: true,
        message: "Demo data generated successfully!",
        eventId: demoEventId,
        participantsCreated: demoParticipants.length,
        roundsCreated: demoRounds.length,
      }
    } catch (error) {
      console.error("Error generating demo data:", error)
      throw new Error("Failed to generate demo data")
    }
  }),

  // POST - Recalculate scores for an event
  recalculateEventScores: publicProcedure.input(z.object({ eventId: z.string() })).mutation(async ({ ctx, input }) => {
    try {
      // Get all rounds for this event
      const eventRounds = await ctx.db.select({ id: rounds.id }).from(rounds).where(eq(rounds.eventId, input.eventId))

      let updatedScores = 0

      // Recalculate scores for each round
      for (const round of eventRounds) {
        // Get all participants who have responses in this round
        const participantResponses = await ctx.db
          .select({
            participantId: responses.participantId,
            totalPoints: sum(responses.pointsEarned),
            totalQuestions: count(responses.id),
            correctAnswers: sql<number>`SUM(CASE WHEN ${responses.isCorrect} = true THEN 1 ELSE 0 END)`,
            totalTime: sum(responses.timeTaken),
            lastSubmission: max(responses.submittedAt),
          })
          .from(responses)
          .where(eq(responses.roundId, round.id))
          .groupBy(responses.participantId)

        // Update or insert scores for each participant
        for (const participantData of participantResponses) {
          const totalPoints = Number(participantData.totalPoints) || 0
          const totalQuestions = Number(participantData.totalQuestions) || 0
          const correctAnswers = Number(participantData.correctAnswers) || 0
          const completionTime = Number(participantData.totalTime) || null

          // Check if participant completed the round
          const sessionData = await ctx.db
            .select({
              isCompleted: participantSessions.isCompleted,
              totalQuestionsAnswered: participantSessions.totalQuestionsAnswered,
            })
            .from(participantSessions)
            .where(
              and(
                eq(participantSessions.participantId, participantData.participantId),
                eq(participantSessions.roundId, round.id),
              ),
            )
            .limit(1)

          const isCompleted = sessionData[0]?.isCompleted || false
          const completedAt = isCompleted ? participantData.lastSubmission : null

          // Upsert score record
          await ctx.db
            .insert(scores)
            .values({
              participantId: participantData.participantId,
              roundId: round.id,
              eventId: input.eventId,
              totalPoints,
              totalQuestions,
              correctAnswers,
              completionTime,
              completedAt,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [scores.participantId, scores.roundId],
              set: {
                totalPoints,
                totalQuestions,
                correctAnswers,
                completionTime,
                completedAt,
                updatedAt: new Date(),
              },
            })

          updatedScores++
        }
      }

      return {
        success: true,
        message: `Successfully recalculated ${updatedScores} score records`,
        updatedScores,
      }
    } catch (error) {
      console.error("Error recalculating scores:", error)
      throw new Error("Failed to recalculate scores")
    }
  }),

  // GET - Event stats with proper completion tracking
  getEventStats: publicProcedure.input(z.object({ eventId: z.string() })).query(async ({ ctx, input }) => {
    // Get comprehensive event statistics
    const [participantStats, responseStats, completionStats] = await Promise.all([
      // Participant statistics
      ctx.db
        .select({
          totalParticipants: countDistinct(participants.id),
          activeParticipants: sql<number>`COUNT(DISTINCT CASE WHEN ${participants.isActive} = true THEN ${participants.id} END)`,
        })
        .from(participants)
        .where(eq(participants.eventId, input.eventId)),

      // Response statistics
      ctx.db
        .select({
          totalResponses: count(responses.id),
          totalCorrectAnswers: sql<number>`SUM(CASE WHEN ${responses.isCorrect} = true THEN 1 ELSE 0 END)`,
          averageScore: avg(responses.pointsEarned),
          highestScore: max(responses.pointsEarned),
          averageTime: avg(responses.timeTaken),
          totalPointsAwarded: sum(responses.pointsEarned),
        })
        .from(responses)
        .innerJoin(rounds, eq(responses.roundId, rounds.id))
        .where(eq(rounds.eventId, input.eventId)),

      // Completion statistics
      ctx.db
        .select({
          totalSessions: count(participantSessions.id),
          completedSessions: sql<number>`COUNT(CASE WHEN ${participantSessions.isCompleted} = true THEN 1 END)`,
          averageQuestionsAnswered: avg(participantSessions.totalQuestionsAnswered),
        })
        .from(participantSessions)
        .where(eq(participantSessions.eventId, input.eventId)),
    ])

    const participantResult = participantStats[0]
    const responseResult = responseStats[0]
    const completionResult = completionStats[0]

    // Calculate derived statistics
    const totalParticipants = Number(participantResult?.totalParticipants) || 0
    const totalResponses = Number(responseResult?.totalResponses) || 0
    const totalCorrectAnswers = Number(responseResult?.totalCorrectAnswers) || 0
    const completedSessions = Number(completionResult?.completedSessions) || 0
    const totalSessions = Number(completionResult?.totalSessions) || 0

    const overallAccuracy = totalResponses > 0 ? Math.round((totalCorrectAnswers / totalResponses) * 100) : 0

    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0

    return {
      totalParticipants,
      activeParticipants: Number(participantResult?.activeParticipants) || 0,
      totalResponses,
      averageScore: Math.round(Number(responseResult?.averageScore) || 0),
      highestScore: Number(responseResult?.highestScore) || 0,
      totalCorrectAnswers,
      overallAccuracy,
      averageTime: Math.round(Number(responseResult?.averageTime) || 0),
      totalPointsAwarded: Number(responseResult?.totalPointsAwarded) || 0,
      completionRate,
      totalSessions,
      completedSessions,
      averageQuestionsAnswered: Math.round(Number(completionResult?.averageQuestionsAnswered) || 0),
    }
  }),

  // GET - Detailed participant performance
  getParticipantPerformance: publicProcedure
    .input(
      z.object({
        participantId: z.string(),
        eventId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get detailed performance data for a specific participant
      const [participantInfo, roundPerformances, overallStats] = await Promise.all([
        // Basic participant info
        ctx.db
          .select()
          .from(participants)
          .where(and(eq(participants.id, input.participantId), eq(participants.eventId, input.eventId)))
          .limit(1),

        // Performance by round
        ctx.db
          .select({
            round: rounds,
            score: scores,
            session: participantSessions,
          })
          .from(scores)
          .innerJoin(rounds, eq(scores.roundId, rounds.id))
          .leftJoin(
            participantSessions,
            and(
              eq(participantSessions.participantId, scores.participantId),
              eq(participantSessions.roundId, scores.roundId),
            ),
          )
          .where(and(eq(scores.participantId, input.participantId), eq(scores.eventId, input.eventId)))
          .orderBy(rounds.orderIndex),

        // Overall statistics
        ctx.db
          .select({
            totalPoints: sum(scores.totalPoints),
            totalQuestions: sum(scores.totalQuestions),
            totalCorrect: sum(scores.correctAnswers),
            averageTime: avg(scores.completionTime),
            roundsCompleted: sql<number>`COUNT(CASE WHEN ${scores.completedAt} IS NOT NULL THEN 1 END)`,
          })
          .from(scores)
          .where(and(eq(scores.participantId, input.participantId), eq(scores.eventId, input.eventId))),
      ])

      const participant = participantInfo[0]
      const overallStat = overallStats[0]

      if (!participant) {
        throw new Error("Participant not found")
      }

      return {
        participant,
        roundPerformances: roundPerformances.map((rp) => ({
          round: rp.round,
          score: rp.score,
          isCompleted: rp.session?.isCompleted || false,
          questionsAnswered: rp.session?.totalQuestionsAnswered || 0,
          accuracy:
            rp.score.totalQuestions > 0 ? Math.round((rp.score.correctAnswers / rp.score.totalQuestions) * 100) : 0,
        })),
        overallStats: {
          totalPoints: Number(overallStat?.totalPoints) || 0,
          totalQuestions: Number(overallStat?.totalQuestions) || 0,
          totalCorrect: Number(overallStat?.totalCorrect) || 0,
          overallAccuracy: overallStat?.totalQuestions
            ? Math.round((Number(overallStat.totalCorrect) / Number(overallStat.totalQuestions)) * 100)
            : 0,
          averageTime: Math.round(Number(overallStat?.averageTime) || 0),
          roundsCompleted: Number(overallStat?.roundsCompleted) || 0,
        },
      }
    }),
})
