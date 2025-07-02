# Quiz Rate Limiting Implementation

This document describes the changes made to implement proper rate limiting and time management for quiz questions.

## Changes Made

### 1. Current Question Endpoint (`current-question/route.ts`)

**Added timing information:**
- `timeRemaining`: Time left in seconds to answer the current question (null if question not started)
- `isExpired`: Boolean indicating if the question time limit has expired
- `effectiveTimeLimit`: The actual time limit being used for the question
- `questionStartedAt`: When the question was started

**Response structure now includes:**
```json
{
  "currentQuestion": { ... },
  "timing": {
    "timeRemaining": 120,
    "isExpired": false,
    "questionStartedAt": "2025-07-01T10:00:00Z",
    "effectiveTimeLimit": 300
  },
  "progress": { ... },
  "session": { ... },
  "round": { ... },
  "event": { ... }
}
```

### 2. Start Question Endpoint (`start-question/route.ts`)

**Added rate limiting logic:**
- Checks if participant is already on a question
- Validates if previous question time limit has expired
- Returns HTTP 429 (Too Many Requests) if trying to start a new question while previous one is still active
- Includes timing information in response

**Enhanced response structure:**
```json
{
  "success": true,
  "session": { ... },
  "timing": {
    "effectiveTimeLimit": 300,
    "timeRemaining": 300,
    "questionStartedAt": "2025-07-01T10:00:00Z"
  }
}
```

**Error response for rate limiting:**
```json
{
  "error": "Previous question time limit has expired. Cannot start new question until current question is completed or skipped.",
  "timeExpired": true,
  "elapsedSeconds": 350,
  "effectiveTimeLimit": 300
}
```

### 3. Submit Answer Endpoint (`submit-answer/route.ts`)

**Added strict time limit enforcement:**
- Rejects answers submitted after the time limit
- Returns HTTP 408 (Request Timeout) for late submissions
- Includes detailed timing information in responses

**Error response for late submissions:**
```json
{
  "error": "Question time limit exceeded. Answer cannot be submitted.",
  "isLate": true,
  "timeTaken": 350,
  "effectiveTimeLimit": 300
}
```

## Time Limit Calculation Logic

The effective time limit is calculated based on the following hierarchy:

1. **Question-specific time limit** (if `useRoundDefault` is false)
2. **Round-specific time limit** (if `useEventDuration` is false)
3. **Event duration** (if `useEventDuration` is true)
4. **Default fallback** (3600 seconds = 1 hour)

```typescript
const effectiveTimeLimit = question.useRoundDefault
  ? round.useEventDuration
    ? event.durationMinutes * 60
    : round.timeLimit || 3600
  : question.timeLimit || 3600;
```

## Rate Limiting Features

### 1. Question Access Control
- Participants cannot start a new question while already on an active question
- Questions expire after their time limit
- Attempting to start a new question before the current one expires returns an error

### 2. Answer Submission Control
- Answers submitted after the time limit are rejected
- Participants receive clear feedback about timing violations

### 3. Real-time Timing Information
- Current question endpoint provides live time remaining updates
- Clients can use this to show countdown timers
- Expired state is clearly indicated

## Client Implementation Notes

### For Frontend Developers:

1. **Poll the current question endpoint** regularly to get updated timing information
2. **Handle rate limiting errors** (HTTP 429) when trying to start questions
3. **Handle timeout errors** (HTTP 408) when submitting late answers
4. **Display countdown timers** using the `timeRemaining` field
5. **Show expired state** when `isExpired` is true

### Example Client Flow:

```javascript
// 1. Get current question with timing
const response = await fetch('/api/quiz/current-question?roundId=123');
const data = await response.json();

if (data.timing.isExpired) {
  // Show expired message, disable answer submission
} else {
  // Show countdown timer with data.timing.timeRemaining
  // Enable answer submission
}

// 2. Start a question (with rate limiting)
const startResponse = await fetch('/api/quiz/start-question', {
  method: 'POST',
  body: JSON.stringify({ questionId: '456', roundId: '123' })
});

if (startResponse.status === 429) {
  // Previous question still active, show appropriate message
}

// 3. Submit answer (with timeout handling)
const submitResponse = await fetch('/api/quiz/submit-answer', {
  method: 'POST',
  body: JSON.stringify({ questionId: '456', roundId: '123', answer: 'A' })
});

if (submitResponse.status === 408) {
  // Answer was too late, show timeout message
}
```

## Security Considerations

1. **Server-side timing enforcement** - All timing logic is handled on the server
2. **Token-based authentication** - All endpoints require valid participant tokens
3. **Database-backed sessions** - Question state is persisted in the database
4. **Atomic operations** - Database transactions ensure consistency

## Testing Recommendations

1. Test rate limiting by trying to start multiple questions rapidly
2. Test timeout handling by waiting past the time limit before submitting
3. Test timing accuracy by comparing client-side and server-side calculations
4. Test edge cases like network delays and clock skew
