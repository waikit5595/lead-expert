# LeadFlow AI Free MVP

A free-tier-friendly SaaS starter for:
- public business lead search
- WhatsApp inbox + reply assistant
- CRM lead tracking
- follow-up generation

## What is included
- Firebase Auth (Google sign-in)
- Firestore lead storage
- Google Places powered Lead Finder
- OpenAI sales message, outreach, follow-up, and WhatsApp reply generation
- Meta WhatsApp webhook receiver
- Meta WhatsApp send-message route
- Inbox UI for viewing and replying to messages
- Basic automation rule editor UI

## What is NOT included yet
- production-grade multi-tenant access control for WhatsApp ownership
- Stripe billing
- robust webhook signature verification
- background jobs / retries
- complete automation persistence

## 0 to 1 setup steps

### 1) Create accounts
Create free accounts for:
- GitHub
- Vercel
- Firebase
- OpenAI
- Google Cloud
- Meta for Developers

### 2) Create the project locally
```bash
npm install
cp .env.local.example .env.local
```

### 3) Firebase setup
In Firebase Console:
1. Create a project.
2. Add a Web app.
3. Enable Authentication -> Google.
4. Enable Firestore Database.
5. Create a service account in Project Settings -> Service accounts.
6. Copy the web config into `.env.local`.
7. Copy the service account values into:
   - `FIREBASE_ADMIN_PROJECT_ID`
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY`

### 4) Firestore rules
Publish the rules from `firestore.rules`.

### 5) OpenAI setup
1. Create an API key.
2. Put it in `OPENAI_API_KEY`.

### 6) Google Places setup
1. In Google Cloud, create or choose a project.
2. Enable Places API (New).
3. Create an API key.
4. Put it in `GOOGLE_MAPS_API_KEY`.

### 7) Meta WhatsApp setup
1. Create a Meta app.
2. Add the WhatsApp product.
3. Get your test phone number and phone number ID.
4. Generate a temporary access token.
5. Put values in:
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ACCESS_TOKEN`
   - `META_VERIFY_TOKEN` (you choose this yourself)

### 8) Start local dev
```bash
npm run dev
```
Open `http://localhost:3000`.

### 9) Deploy to Vercel
1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Add the same environment variables in Vercel Project Settings.
4. Deploy.

### 10) Connect the WhatsApp webhook
After you have a live Vercel URL, use this endpoint in Meta:
```text
https://YOUR-APP.vercel.app/api/webhooks/whatsapp
```
Verification token must exactly match `META_VERIFY_TOKEN`.

### 11) Send your first test message
Use the WhatsApp test number from Meta and send a message from a permitted test recipient.
Then open `/inbox` to view it.

## Recommended free-tier build order
1. Login
2. Lead Finder
3. Leads CRM
4. AI Assistant
5. WhatsApp webhook
6. Inbox reply
7. Automation rules

## Free-tier notes
This starter is designed to be launched with free plans at low volume, but free limits can change and some services may still require billing setup even if your usage stays within free quotas.
