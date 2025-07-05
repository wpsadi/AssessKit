# Participant & Quiz APIs

These APIs are designed for participant-facing quiz functionality.

## Authentication

All quiz APIs require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. Participant Login
**POST** `/api/participant/login`

Login a participant and receive a token.

**Body:**
```json
{
  "email": "participant@example.com",
  "password": "password123",
  "eventId": "event-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "token": "base64-encoded-token",
  "participant": {
    "id": "participant-uuid",
    "name": "Participant Name",
    "email": "participant@example.com",
    "eventId": "event-uuid"
  },
  "session": {
    "sessionId": "session-uuid",
    "roundId": "round-uuid",
    "roundTitle": "Round 1",
    "isNewSession": true
  }
}
```

### 2. Verify Token
**GET** `/api/participant/verify`

Verify if a token is valid.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "participant": {
    "id": "participant-uuid",
    "email": "participant@example.com",
    "name": "Participant Name",
    "eventId": "event-uuid"
  }
}
```

### 3. Get Current Question
**GET** `/api/quiz/current-question?eventId=<event-uuid>`

Get the current question for the participant. The active round is auto-detected.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "currentQuestion": {
    "id": "question-uuid",
    "questionId": "Q1",
    "positivePoints": 10,
    "negativePoints": -2,
    "timeLimit": 60,
    "useRoundDefault": false,
    "orderIndex": 1,
    "effectiveTimeLimit": 60
  },
  "timing": {
    "timeRemaining": null,
    "isExpired": false,
    "questionStartedAt": null,
    "effectiveTimeLimit": 60
  },
  "progress": {
    "current": 1,
    "total": 10,
    "answered": 0
  },
  "session": {
    "id": "session-uuid",
    "isOnQuestion": false,
    "questionStartedAt": null
  },
  "round": {
    "id": "round-uuid",
    "title": "Round 1",
    "useEventDuration": false,
    "timeLimit": 300
  },
  "event": {
    "id": "event-uuid",
    "title": "Quiz Event",
    "durationMinutes": 60
  }
}
```

### 4. Start Question
**POST** `/api/quiz/start-question`

Mark that the participant is now viewing a question (starts timing). The active round is auto-detected based on the event.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "questionId": "Q1"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "session-uuid",
    "questionStartedAt": "2025-07-01T10:30:00.000Z",
    "isOnQuestion": true
  },
  "timing": {
    "effectiveTimeLimit": 60,
    "timeRemaining": 60,
    "questionStartedAt": "2025-07-01T10:30:00.000Z"
  },
  "question": {
    "questionId": "Q1",
    "answerIds": ["paris", "Paris", "PARIS"],
    "positivePoints": 10,
    "negativePoints": -2,
    "timeLimit": 60,
    "useRoundDefault": false
  },
  "round": {
    "title": "Round 1",
    "timeLimit": 300,
    "useEventDuration": false
  }
}
```

### 5. Submit Answer
**POST** `/api/quiz/submit-answer`

Submit an answer for a question.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "questionId": "Q1",
  "eventId": "event-uuid",
  "answer": "paris"
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    "id": "response-uuid",
    "isCorrect": true,
    "pointsEarned": 10,
    "timeTaken": 45,
    "isLate": false,
    "correctAnswers": ["paris", "Paris", "PARIS"]
  }
}
```

## Usage Flow

1. Participant logs in with email/password/eventId → receives token
2. Frontend stores token and uses it for all subsequent requests
3. Get current question for a round
4. When participant starts viewing the question, call start-question
5. When participant submits answer, call submit-answer
6. Repeat steps 3-5 for each question

## Notes

- Answers are strictly matched against the `answerIds` array
- Time tracking starts when `start-question` is called
- Late submissions are marked with `isLate: true` but still accepted
- Each question can only be answered once per participant
- Sessions track participant progress through the quiz
