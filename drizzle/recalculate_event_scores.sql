CREATE OR REPLACE FUNCTION recalculate_event_scores(event_id_param UUID)
RETURNS void AS $$
BEGIN
    -- Recalculate scores for the given event
    WITH calculated_scores AS (
        SELECT
            p.id AS participant_id,
            a.round_id,
            e.id AS event_id,
            COALESCE(SUM(q.points), 0) AS total_points,
            COUNT(a.id) AS total_questions,
            COUNT(CASE WHEN a.is_correct THEN 1 END) AS correct_answers,
            MAX(a.created_at) - MIN(a.created_at) AS completion_time,
            MAX(a.created_at) AS completed_at
        FROM
            participants p
            JOIN answers a ON p.id = a.participant_id
            JOIN questions q ON a.question_id = q.id
            JOIN rounds r ON a.round_id = r.id
            JOIN events e ON r.event_id = e.id
        WHERE
            e.id = event_id_param
        GROUP BY
            p.id, a.round_id, e.id
    )
    -- Update the scores table
    INSERT INTO scores (participant_id, round_id, event_id, total_points, total_questions, correct_answers, completion_time, completed_at)
    SELECT
        participant_id,
        round_id,
        event_id,
        total_points,
        total_questions,
        correct_answers,
        completion_time,
        completed_at
    FROM
        calculated_scores
    ON CONFLICT (participant_id, round_id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        total_questions = EXCLUDED.total_questions,
        correct_answers = EXCLUDED.correct_answers,
        completion_time = EXCLUDED.completion_time,
        completed_at = EXCLUDED.completed_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;