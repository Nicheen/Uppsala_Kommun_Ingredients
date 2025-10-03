# Manual Labeling Feature Setup Instructions

## Overview
This app now includes a community-driven manual labeling system where users can:
- Add manual labels to ingredients that don't have database matches
- Vote on existing labels (thumbs up/down)
- See which ingredients have community labels (indicated by 👥 icon)
- Track user contributions via simple email authentication
- **Edit and delete their own labels**

## Setup Steps

### 1. Set Up Supabase Database

1. Go to [Supabase](https://supabase.com) and create a new project (or use existing)

2. Run the SQL schema in the Supabase SQL Editor:
   - Open your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `SUPABASE_SCHEMA.sql`
   - Execute the SQL

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get your Supabase anon key:
   - In Supabase dashboard, go to Settings → API
   - Copy the "anon public" key

3. Update `.env`:
   ```
   VITE_SUPABASE_KEY=your-supabase-anon-key-here
   ```

### 3. Enable Email Authentication in Supabase

1. In Supabase dashboard, go to Authentication → Providers
2. Enable Email provider
3. Configure email templates (optional but recommended):
   - Go to Authentication → Email Templates
   - Customize the confirmation email template

### 4. Install Dependencies and Run

```bash
npm install
npm run dev
```

## Features Implemented

### 1. Authentication
- Simple email/password sign up and sign in
- Modal-based authentication UI
- Session persistence
- Sign out functionality

### 2. Manual Labeling
- Users can add labels to any ingredient
- Three status options: Approved (green), Non-Approved (red), Unknown (gray)
- Optional notes field for additional context
- Only authenticated users can create labels
- **Authors can edit and delete their own labels**
- Edited labels show "(edited)" indicator with timestamp

### 3. Voting System
- Thumbs up/down voting on labels
- Vote counts displayed for each label
- Users can change or remove their votes
- Labels sorted by net votes (upvotes - downvotes)
- **Top-voted label determines ingredient color when no database match exists**

### 4. Visual Indicators
- 👥 icon appears next to ingredients with community labels
- Labels displayed in details panel
- Creator attribution and timestamp shown

### 5. Data Caching
- Manual labels cached locally to reduce database calls
- Real-time updates when labels are created or voted on

## Database Schema

The system uses three main tables:

1. **profiles** - User profiles (auto-created on sign up)
2. **manual_labels** - Community ingredient labels
3. **label_votes** - User votes on labels

All tables have Row Level Security (RLS) enabled for data protection.

## Security Features

- Row Level Security (RLS) policies ensure users can only:
  - Create labels when authenticated
  - Edit/delete their own labels
  - Vote on labels when authenticated
  - Update/delete their own votes
- Email verification recommended for production
- Anon key is safe to expose in frontend (limited permissions)

## Deployment Notes

For production deployment:

1. **Never commit `.env` file** - It's already in `.gitignore`
2. Set `VITE_SUPABASE_KEY` in your deployment platform's environment variables
3. Configure email settings in Supabase for proper email delivery
4. Consider enabling email confirmation to prevent spam
5. Monitor Supabase usage limits on free tier

## Testing

To test the feature:

1. Analyze some ingredients
2. Click "Sign In" button and create an account
3. Click on an ingredient to view details
4. Scroll down and click "+ Add Community Label"
5. Fill out the form and submit
6. Vote on your label or others' labels
7. Notice the 👥 indicator on labeled ingredients
8. As the author, click "Edit" to modify your label
9. Click "Delete" to remove your label (with confirmation)

## Troubleshooting

**Labels not showing up:**
- Check browser console for errors
- Verify Supabase credentials in `.env`
- Ensure SQL schema was executed successfully

**Can't sign in:**
- Check email confirmation settings in Supabase
- Verify email provider is enabled
- Check Supabase logs for authentication errors

**Votes not working:**
- Ensure user is signed in
- Check RLS policies are correctly set up
- Verify `label_votes` table exists
