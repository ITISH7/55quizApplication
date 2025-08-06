# Live Quiz Testing Guide

## Complete Testing Flow

### Step 1: Admin Setup (Create a Quiz)
1. **Login as Admin**: Use `nishant.gandhi@fiftyfivetech.io` or `itish.jain@fiftyfivetech.io`
2. **Get OTP**: Check console logs for 6-digit code
3. **Navigate to Admin Dashboard**: `/admin`
4. **Create New Quiz**:
   - Title: "Test Quiz"
   - Passkey: "test123"
   - Add questions manually or upload Excel file
5. **Start the Quiz**: Click "Start Quiz" button

### Step 2: Candidate Testing (Join and Play)
1. **Login as Regular User**: Use any `@fiftyfivetech.io` email (e.g., `test@fiftyfivetech.io`)
2. **Get OTP**: Check console logs for 6-digit code  
3. **Navigate to Dashboard**: `/dashboard`
4. **Join Quiz**:
   - Find the active quiz
   - Enter passkey: "test123"
   - Click "Join Quiz"
   - System automatically redirects to live quiz page
5. **Answer Questions**: Click options, submit answers
6. **View Results**: See leaderboard and final scores

## Current Issue Resolution

✅ **"Session Not Found" Message**: This is CORRECT behavior
- It appears when you try to access `/quiz/{id}` directly without joining first
- You must join through dashboard to create a session

✅ **Submit Button**: Fixed - will work once you properly join a quiz

✅ **Authentication**: Working perfectly for both admin and candidates

## Testing URLs
- Login: `/login`
- Admin Dashboard: `/admin` (admin only)
- User Dashboard: `/dashboard` (candidates)
- Live Quiz: `/quiz/{quiz-id}` (only after joining)

## Expected Behavior
- Direct access to quiz page → "Join Quiz First" message (CORRECT)
- Proper join flow → Live quiz with working submit button (FIXED)

## Debug Features
- Console logs show session creation/retrieval
- Debug info shows selected answers and session status
- Clear error messages guide users through proper flow