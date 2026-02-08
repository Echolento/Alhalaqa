# Supabase Setup Guide

Follow these steps to fix your database and set up professional email templates.

## Phase 1: Fix Database & RLS (Critical)

1.  **Open Supabase Admin Panel**.
2.  Navigate to the **SQL Editor** (icon with `>_` on the left sidebar).
3.  Click **"New query"**.
4.  Open the file `scripts/004_fix_rls_and_trigger.sql` in your VS Code.
5.  **Copy the entire content** of the file.
6.  **Paste** it into the Supabase SQL Editor.
7.  Click the **"Run"** button (bottom right of the editor).
    *   *Result:* You should see "Success. No rows returned" or similar. This fixes the infinite recursion error and ensures profiles are created on signup.

## Phase 2: Setup Email Templates

1.  Navigate to **Authentication** (icon with a lock 🔒).
2.  Click on **Email Templates** in the inner sidebar.
3.  Open the file `email-templates.md` in VS Code to see the new designs.

### A. Confirm Signup (تأكيد التسجيل)
1.  Click on **"Confirm signup"** in Supabase.
2.  **Subject:** Copy `تأكيد تسجيل حسابك في منصة معلم القرآن`
3.  **Body:** Copy the HTML code under "1. Confirm Your Signup" from `email-templates.md`.
4.  Switch the editor to "Source" or just Paste the HTML code replacing the details.
5.  Click **Save**.

### B. Reset Password (إعادة تعيين كلمة المرور)
1.  Click on **"Reset password"**.
2.  **Subject:** Copy `طلب إعادة تعيين كلمة المرور`
3.  **Body:** Copy the HTML code from "2. Reset Password".
4.  Click **Save**.

### C. Invite User (دعوة مستخدم)
1.  Click on **"Invite user"**.
2.  **Subject:** Copy `دعوة للانضمام إلى منصة معلم القرآن`
3.  **Body:** Copy the HTML code from "3. Invite User".
4.  Click **Save**.

### D. Magic Link (رابط تسجيل الدخول السريع)
1.  Click on **"Magic Link"**.
2.  **Subject:** Copy `رابط الدخول السريع`
3.  **Body:** Copy the HTML code from "4. Magic Link".
4.  Click **Save**.

## Phase 3: Verify

1.  Go back to your app (`localhost:3000` or wherever it's running).
2.  Try to **Sign Up** a new user.
3.  Check your email (or the fake email inbox if testing locally). You should receive the formatted email.
4.  Click the confirmation link.
5.  You should be logged in and redirected to the dashboard **without** the "Profile Not Found" error.
