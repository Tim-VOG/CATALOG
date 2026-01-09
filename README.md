# EquipLend - Equipment Lending System

A modern equipment lending management system for internal company use.

## 🚀 Quick Deploy Guide

### Step 1: Create Supabase Project (5 min)

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Name**: `equiplend` (or your choice)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"** (wait ~2 min)

### Step 2: Setup Database (2 min)

1. In Supabase dashboard, go to **SQL Editor** (left menu)
2. Click **"New Query"**
3. Copy the entire content of `supabase/schema.sql`
4. Paste it in the SQL editor
5. Click **"Run"** (or Ctrl+Enter)
6. You should see "Success. No rows returned"

### Step 3: Get Your API Keys

1. Go to **Settings** → **API** (left menu)
2. Copy these values (you'll need them):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)

### Step 4: Configure Authentication

1. Go to **Authentication** → **Providers** (left menu)
2. Make sure **Email** is enabled
3. (Optional) To restrict to your company domain:
   - Go to **Authentication** → **URL Configuration**
   - You can set allowed redirect URLs

### Step 5: Create First Admin User

1. Go to **Authentication** → **Users**
2. Click **"Add User"** → **"Create New User"**
3. Enter your email and password
4. After creation, go to **Table Editor** → **profiles**
5. Find your user and change `role` from `user` to `admin`

### Step 6: Deploy to GitHub

1. Create a new repository on GitHub
2. Push this code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/equiplend.git
git push -u origin main
```

### Step 7: Deploy to Vercel (Free)

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **"Add New Project"**
3. Import your `equiplend` repository
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
5. Click **"Deploy"**
6. Your app will be live at `https://equiplend-xxx.vercel.app`

---

## 🔒 Security Configuration

### Restrict to Company Email Domain

In Supabase SQL Editor, run:
```sql
-- Only allow @yourcompany.com emails to sign up
CREATE OR REPLACE FUNCTION check_email_domain()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email NOT LIKE '%@yourcompany.com' THEN
        RAISE EXCEPTION 'Only company emails allowed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_email_domain
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION check_email_domain();
```

### Make Users Admin

```sql
-- Make a user admin by email
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@yourcompany.com';
```

---

## 📁 Project Structure

```
equiplend-app/
├── public/
├── src/
│   ├── components/     # React components
│   ├── lib/           # Supabase client & utilities
│   ├── pages/         # Page components
│   ├── App.jsx        # Main app
│   ├── App.css        # Styles
│   └── main.jsx       # Entry point
├── supabase/
│   └── schema.sql     # Database schema
├── .env.example       # Environment template
├── package.json
└── vite.config.js
```

---

## 🛠️ Local Development

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your Supabase keys
3. Install dependencies:
```bash
npm install
```
4. Start dev server:
```bash
npm run dev
```
5. Open http://localhost:3000

---

## 📧 Email Notifications (Optional)

Supabase can send emails for:
- User signup confirmation
- Password reset

To customize, go to **Authentication** → **Email Templates** in Supabase.

For advanced notifications (loan approvals, reminders), you can:
1. Use Supabase Edge Functions
2. Connect to SendGrid/Resend/etc.

---

## 🔄 Updating Products/Categories

As an admin:
1. Login to the app
2. Go to Admin → Products
3. Use "Add Product" or "Categories" buttons

All changes are saved to the database immediately.

---

## 📊 Database Backups

Supabase automatically backs up your database daily (Pro plan) or you can manually export:
1. Go to **Settings** → **Database**
2. Scroll to **Database Backups**

---

## 🆘 Troubleshooting

### "Invalid API key"
- Check your `.env` file has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Make sure there are no extra spaces

### "Permission denied"
- The user might not have the correct role
- Check the `profiles` table and ensure `role` is set correctly

### Users can't sign up
- Check if email domain restriction is enabled
- Check Supabase Authentication settings

---

## 📄 License

Internal use only - [Your Company Name]
