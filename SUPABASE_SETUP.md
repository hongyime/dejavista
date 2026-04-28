# DejaVista Supabase Setup Guide

## Current Status

✅ **Environment variables updated** with new Supabase project credentials  
✅ **GitHub Actions workflow created** for keep-alive pings  
⚠️ **Database tables need to be created** (see steps below)  
⚠️ **GitHub Secrets need to be configured** (see steps below)

---

## New Supabase Project Details

- **Project Name**: dejavista
- **Project URL**: https://tabvxrmvtbzlqjfgxvuf.supabase.co
- **Project Ref**: tabvxrmvtbzlqjfgxvuf

---

## Step 1: Create Database Tables

Go to your Supabase Dashboard → SQL Editor and run these files **in order**:

### 1.1 Create Main Table (001_closet_items.sql)

```sql
-- DejaVista Database Schema
-- Run this in Supabase SQL Editor to set up the database from scratch

-- ============================================
-- 1. CLOSET ITEMS TABLE
-- Stores tracked clothing items from user browsing
-- ============================================

CREATE TABLE IF NOT EXISTS closet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient user queries ordered by date
CREATE INDEX IF NOT EXISTS idx_closet_user_date ON closet_items(user_id, created_at DESC);

-- ============================================
-- 2. ROW LEVEL SECURITY (RLS)
-- Ensures users can only access their own data
-- ============================================

ALTER TABLE closet_items ENABLE ROW LEVEL SECURITY;

-- Users can only read their own items
CREATE POLICY "Users view own items" ON closet_items
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own items
CREATE POLICY "Users insert own items" ON closet_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own items
CREATE POLICY "Users delete own items" ON closet_items
  FOR DELETE USING (auth.uid() = user_id);
```

### 1.2 Create Storage Bucket (Manual Step)

Before running the next SQL file:

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Name: `user_photos`
4. Set to **Private** (not public)
5. Click **Create bucket**

### 1.3 Create Storage Policies (002_storage_policies.sql)

```sql
-- DejaVista Storage Setup
-- Run this in Supabase SQL Editor to set up storage bucket and policies

-- ============================================
-- STORAGE RLS POLICIES
-- Run these after creating the bucket
-- ============================================

-- Users can upload their own photos
-- Path pattern: {user_id}/reference.jpg
CREATE POLICY "Users upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own photos
CREATE POLICY "Users view own photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own photos
CREATE POLICY "Users update own photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own photos
CREATE POLICY "Users delete own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Step 2: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_URL` | `https://tabvxrmvtbzlqjfgxvuf.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `<set privately in the deployment environment>` |

---

## Step 3: Test the Keep-Alive Workflow

1. Go to your GitHub repository → Actions
2. Find the "Supabase Keep Alive" workflow
3. Click "Run workflow" → "Run workflow"
4. Wait for it to complete
5. Check the logs to ensure it succeeded

The workflow will automatically run every 5 days to keep your Supabase project active.

---

## Step 4: Enable Google OAuth (Optional)

If you want users to sign in with Google:

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Enable **Google**
3. Add your Google OAuth Client ID and Secret
4. Add redirect URL: `https://tabvxrmvtbzlqjfgxvuf.supabase.co/auth/v1/callback`

---

## Verification Checklist

- [ ] Database table `closet_items` created
- [ ] Storage bucket `user_photos` created
- [ ] Storage policies applied
- [ ] GitHub secrets configured
- [ ] Keep-alive workflow tested manually
- [ ] Keep-alive workflow scheduled (runs every 5 days)

---

## Troubleshooting

### Workflow fails with 401/403 error
- Check that `SUPABASE_SERVICE_ROLE_KEY` secret is set correctly
- Verify the key hasn't expired

### Workflow fails with 404 error
- Ensure the `closet_items` table exists in your database
- Check that `SUPABASE_URL` secret is correct

### Table creation fails
- Make sure you're running the SQL in the correct order
- Check that you have admin access to the Supabase project

---

## Keep-Alive Schedule

The workflow runs:
- **Automatically**: Every 5 days at 08:00 UTC
- **Manually**: Via GitHub Actions UI anytime

This ensures your Supabase project stays active and doesn't get paused due to inactivity.
