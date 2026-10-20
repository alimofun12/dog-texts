# Dog Texts (test version)

Your dog texts you through the day. Owners take a personality quiz, upload real photos, save the dog as a contact, and from then on the dog texts them from a real number in its own voice. They can text back and the dog answers.

## How it works

| Piece | What it does |
| --- | --- |
| `app/page.tsx` | The setup flow: quiz, photos, character card, texting settings, phone number, contact card |
| `app/api/dogs` | Saves the dog's profile and photos |
| `app/api/contact/[id]` | The contact card (.vcf) with the dog's name, real photo and the dog line |
| `app/api/hello` | Sends the first text once the owner saved the contact |
| `app/api/sms` | Twilio calls this when an owner texts the dog. Claude writes the reply |
| `app/api/checkins` | Sends unprompted check ins when they're due, respecting frequency and quiet hours |
| `.github/workflows/checkins.yml` | Wakes `/api/checkins` every 10 minutes |
| `lib/voice.ts` | The dog's personality prompt. Edit this to tune the humor |

Data lives in Upstash Redis. Texts go through Twilio. Claude writes every text.

## Setup (about 20 minutes)

### 1. Twilio (the dog line)
1. Sign up at twilio.com. The free trial is fine for testing.
2. Get a phone number with SMS (Phone Numbers > Buy a number).
3. Trial accounts can only text numbers you verify: add each tester under Phone Numbers > Verified Caller IDs. Trial texts start with a short "Sent from your Twilio trial account" line.
4. Copy your Account SID and Auth Token from the console home page.

### 2. Claude
Create an API key at console.anthropic.com.

### 3. Vercel
1. Import this repo as a project.
2. Storage tab > Create > Upstash for Redis, and connect it to the project. This adds the Redis variables for you.
3. Settings > Environment Variables, add everything in `.env.example`:
   `ANTHROPIC_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `CRON_SECRET` (any long random string), `PUBLIC_BASE_URL` (your site address, no trailing slash).
4. Redeploy so the variables take effect.

### 4. Point Twilio at the app
Twilio console > your number > Messaging configuration > "A message comes in": Webhook, `https://YOUR-SITE/api/sms`, HTTP POST.

### 5. Turn on check ins
GitHub repo > Settings > Secrets and variables > Actions > New repository secret:
- `APP_URL` = your site address
- `CRON_SECRET` = the same value as in Vercel

Then Actions tab > Dog check ins > Run workflow, to confirm it works.

## Test it
Open your site on your phone, set up your own dog, save the contact, tap "Done. Text me". The first text should land within a few seconds. Reply to it.

## Notes
- STOP pauses a dog, START resumes. Twilio sends the official replies.
- "Just check ins" mode: the dog texts but doesn't reply.
- Before opening this beyond a few friends, US carriers require registering the number for business texting (A2P 10DLC, or toll free verification). Plan a few weeks for that.
- `npm test` runs the scheduling, breed matching, text cleanup and contact card tests.
