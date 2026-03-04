# 🛠️ Microsoft Entra ID Setup Guide

This guide walks you through creating an App Registration in Microsoft Entra ID and configuring the required permissions for this dashboard.

---

## Prerequisites

- An Azure subscription or access to a Microsoft 365 tenant
- A user account with at least **Cloud Application Administrator** or **Global Administrator** role
- Access to the [Azure Portal](https://portal.azure.com)

---

## Step 1 — Create an App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID → App registrations → + New registration**
3. Fill in:
   - **Name**: `Employee Admin Dashboard`
   - **Supported account types**: `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI**: Select `Single-page application (SPA)` and enter:
     - `http://localhost:3000` (for local development)
4. Click **Register**

> **Save these values** — you will need them for your `.env.local`:
> - **Application (client) ID** → `NEXT_PUBLIC_CLIENT_ID`
> - **Directory (tenant) ID** → `NEXT_PUBLIC_TENANT_ID`
> - Authority URL: `https://login.microsoftonline.com/{tenant-id}` → `NEXT_PUBLIC_AUTHORITY`

---

## Step 2 — Create a Client Secret

This secret is used by the **server-side** API routes to call Microsoft Graph.

1. In your App Registration, go to **Certificates & secrets → + New client secret**
2. Set a description (e.g., `Dashboard Server Secret`) and expiry (e.g., 24 months)
3. Click **Add**
4. **Copy the secret value immediately** — it will not be shown again
5. Save it as `SERVICE_PRINCIPAL_CLIENT_SECRET` in your `.env.local`

> ⚠️ **CAUTION**: Never commit your client secret to Git. Keep it in `.env.local` which is git-ignored.

---

## Step 3 — Configure API Permissions

The app needs these Microsoft Graph permissions:

1. Go to **API permissions → + Add a permission → Microsoft Graph → Application permissions**
2. Search for and add:
   - ✅ `User.ReadWrite.All` — to update user profiles
   - ✅ `Directory.Read.All` — to read group memberships and manager info
   - ✅ `GroupMember.Read.All` — to check security group membership
3. Click **Add permissions**
4. Click **✅ Grant admin consent for [your tenant]** (requires admin role)

> **Note**: Application permissions (not delegated) are used by the server via client credentials. The user-facing MSAL login only needs `User.Read` which is already pre-configured.

---

## Step 4 — Create a Security Group

This group controls who can access the dashboard (HR + IT staff).

1. Go to **Microsoft Entra ID → Groups → + New group**
2. Set:
   - **Group type**: Security
   - **Group name**: `Dashboard Admins` (or any name)
   - **Membership type**: Assigned
3. Add HR and IT members
4. Click **Create**
5. After creation, go to the group → **Overview** → copy the **Object ID**
6. Save it as `ALLOWED_SECURITY_GROUP_ID` in your `.env.local`

> If you leave `ALLOWED_SECURITY_GROUP_ID` empty, all authenticated users in your tenant can access the dashboard.

---

## Step 5 — Create Your `.env.local`

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in all values:

```env
NEXT_PUBLIC_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_AUTHORITY=https://login.microsoftonline.com/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

SERVICE_PRINCIPAL_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SERVICE_PRINCIPAL_CLIENT_SECRET=your_client_secret_here

ALLOWED_SECURITY_GROUP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

NEXTAUTH_URL=http://localhost:3000
```

---

## Step 6 — Run the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a Microsoft 365 work account.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "AADSTS700016: Application not found" | Check `NEXT_PUBLIC_CLIENT_ID` is correct |
| "AADSTS50011: Redirect URI mismatch" | Add `http://localhost:3000` to App Registration → Authentication → Redirect URIs |
| "Access Denied" on dashboard | Your account is not in the security group, or `ALLOWED_SECURITY_GROUP_ID` is wrong |
| "Missing service principal credentials" | Check `SERVICE_PRINCIPAL_CLIENT_ID` and `SECRET` in `.env.local` |
| "Insufficient privileges" from Graph API | Make sure admin consent was granted for the application permissions |
