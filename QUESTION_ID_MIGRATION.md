# Question ID Migration Changes

This document summarizes the changes made to migrate from `questionText` to `questionId` throughout the application.

## Database Schema Changes

### 1. Questions Table Schema (`src/server/db/schema.ts`)
- **Changed**: `questionText: text("question_text").notNull()` → `questionId: text("question_id").notNull()`
- **Impact**: All questions now store a user-provided question ID instead of question text

## Backend API Changes

### 2. tRPC Questions Router (`src/server/api/routers/questions.ts`)
- **Updated schemas**:
  - `createQuestionSchema`: `questionText` → `questionId`
  - `updateQuestionSchema`: `questionText` → `questionId`
  - `bulkCreate` input schema: `questionText` → `questionId`
- **Updated mutation implementations** to use `questionId` field
- **Impact**: All question creation and updates now accept question ID instead of text

### 3. New API Route (`src/app/api/events/[eventId]/questions/[questionId]/route.ts`)
- **Created**: New GET endpoint to fetch question details by question ID
- **Returns**: Question data with `questionId` field and compatibility aliases
- **Used by**: Frontend components to fetch question details for display

## Frontend Type Changes

### 4. Types Definition (`src/lib/types.ts`)
- **Updated**: `Question` interface
- **Changed**: `questionText: string` → `questionId: string`
- **Impact**: All TypeScript code now expects `questionId` instead of `questionText`

## UI Component Changes

### 5. Form Components
Updated all question creation and editing forms:

#### a. Simple Create Question Dialog (`simple-create-question-dialog.tsx`)
- **Label**: "Question Text" → "Question ID"
- **Field names**: `questionText` → `questionId`
- **Placeholder**: "Enter your question" → "Enter your question ID"
- **Form submission**: Now sends `questionId` field

#### b. Simple Question Editor (`simple-question-editor.tsx`)
- **Label**: "Question Text" → "Question ID"
- **Field names**: `questionText` → `questionId`
- **Display**: Shows `question.questionId` instead of `question.questionText`
- **Form submission**: Now sends `questionId` field

#### c. Create Question Dialog (`$create-question-dialog.tsx`)
- **Label**: "Question Text" → "Question ID"
- **Mutation**: Now sends `questionId` field

#### d. Advanced Create Question Dialog (`$advanced-create-question-dialog.tsx`)
- **Label**: "Question Text" → "Question ID"
- **Mutation**: Now sends `questionId` field

### 6. Display Components

#### a. Participant Answers List (`participant-answers-list.tsx`)
- **Interface**: Updated `Question` interface to use `questionId`
- **API fetch**: Now expects `questionId` field from API
- **Display**: Shows `question.questionId` instead of `question.text`
- **Search**: Now searches through `questionId` field

## Migration Notes

### Data Migration Required
Since this is a schema change, you'll need to migrate existing data:

1. **Database Migration**: Run a database migration to:
   - Rename the column from `question_text` to `question_id`
   - Update existing data if needed (or populate with default values)

2. **Example Migration SQL**:
```sql
-- Rename column
ALTER TABLE questions RENAME COLUMN question_text TO question_id;

-- Optional: Update existing data to have meaningful IDs
-- UPDATE questions SET question_id = 'Q' || order_index || '_' || substr(id, 1, 8);
```

### Breaking Changes
- **Database schema**: Column name changed
- **API contracts**: All question-related APIs now expect/return `questionId`
- **Frontend**: All forms and displays now use question ID
- **Type definitions**: TypeScript interfaces updated

### Compatibility
- The new API route provides compatibility aliases (`correctAnswerIds`)
- Frontend components gracefully handle both old and new field names during transition

### Benefits of This Change
1. **User Control**: Users now provide their own question identifiers
2. **Better Search**: Question IDs are more searchable than full text
3. **Cleaner Data**: Separates question content from question identification
4. **Consistency**: Aligns with the pattern of using IDs for answers

### Testing Recommendations
1. Test all question creation flows
2. Test question editing functionality
3. Test participant answer display
4. Verify search functionality with question IDs
5. Test API endpoints return correct data structure
