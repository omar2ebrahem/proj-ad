# 🚀 Deployment Guide — Vercel

This guide deploys the Employee Admin Dashboard to [Vercel](https://vercel.com) — the recommended hosting platform for Next.js applications.

---

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier works)
- Your project pushed to a **GitHub, GitLab, or Bitbucket** repository
- Microsoft Entra ID fully configured (see [SETUP.md](./SETUP.md))

---

## Step 1 — Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/employee-admin-dashboard.git
git push -u origin main
```

> ⚠️ Make sure `.gitignore` contains `.env.local` — **never commit secrets to Git**.

A minimal `.gitignore` should include:
```
.env.local
.env*.local
node_modules/
.next/
```

---

## Step 2 — Import Project on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Authorize Vercel to access your GitHub
4. Select your repository
5. Click **Import**

Vercel will auto-detect the **Next.js** framework. Leave all build settings as defaults.

---

## Step 3 — Configure Environment Variables

Before deploying, add all environment variables:

1. In the Vercel import wizard (or later via **Project → Settings → Environment Variables**), add:

| Variable | Value | Where |
|----------|-------|-------|
| `NEXT_PUBLIC_CLIENT_ID` | App Registration Client ID | All environments |
| `NEXT_PUBLIC_TENANT_ID` | Azure Tenant ID | All environments |
| `NEXT_PUBLIC_AUTHORITY` | `https://login.microsoftonline.com/{tenant-id}` | All environments |
| `SERVICE_PRINCIPAL_CLIENT_ID` | App Registration Client ID | All environments |
| `SERVICE_PRINCIPAL_CLIENT_SECRET` | Client Secret value | All environments |
| `ALLOWED_SECURITY_GROUP_ID` | Security Group Object ID | All environments |
| `NEXTAUTH_URL` | Your production Vercel URL: `https://your-app.vercel.app` | Production only |

> ⚠️ For `NEXTAUTH_URL`, Vercel provides this automatically as `VERCEL_URL`, but it must be the full `https://` URL.

---

## Step 4 — Deploy

Click **Deploy**. Vercel will:
1. Install dependencies (`npm install`)
2. Build the Next.js app (`npm run build`)
3. Deploy to a global edge network

Your app will be live at: `https://your-project.vercel.app`

---

## Step 5 — Update Redirect URIs in Entra ID

After deployment, add your Vercel URL as an authorized redirect URI:

1. Go to [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID → App Registrations → Your App**
2. Click **Authentication**
3. Under **Single-page application**, add:
   - `https://your-project.vercel.app`
   - `https://your-project.vercel.app/dashboard`
4. Click **Save**

> You can keep `http://localhost:3000` for local development alongside the production URL.

---

## Step 6 — Verify the Deployment

1. Open `https://your-project.vercel.app`
2. You should see the **AzureAdmin login page**
3. Click **Sign in with Microsoft** — a popup should appear
4. Sign in with a Microsoft 365 account that is a member of the security group
5. You should be redirected to the dashboard

---

## Re-deploying

Every `git push` to the `main` branch will **automatically trigger a re-deploy** on Vercel.

For manual re-deploys:
```bash
vercel --prod
```
(Requires [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`)

---

## Custom Domain (Optional)

1. In Vercel → **Project → Settings → Domains**
2. Add your custom domain (e.g., `admin.yourcompany.com`)
3. Follow Vercel's DNS instructions
4. Add the custom domain to Entra ID redirect URIs (Step 5 above)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails: "Missing environment variable" | Check all env vars are set in Vercel dashboard |
| MSAL redirect fails on production | Add the Vercel URL to Entra ID → App Registration → Authentication |
| "Access Denied" after login | Ensure user is in the security group and `ALLOWED_SECURITY_GROUP_ID` is set |
| CORS errors | These are normal during local dev if you're testing against production — use `http://localhost:3000` locally |
