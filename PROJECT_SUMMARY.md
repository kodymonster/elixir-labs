# Elixir Labs — Project Summary

Full handoff notes covering everything built and decided in the Claude Code session(s) so far. This file lives in the project root (synced via OneDrive), so it travels with the project to any PC.

## What this project is

A storefront website + Discord bot for **Elixir Labs**, selling pre-leveled Clash Royale accounts. Payment is via Cash App (no payment gateway — it's a small, manual-fulfillment operation with a Discord bot automating the repetitive parts).

- **Local path:** `C:\Users\kodyk\OneDrive\Documents\Elixer Labs`
- **GitHub repo:** `https://github.com/kodymonster/elixir-labs` (branch `main`)
- **Cash App tag:** `$heehehaaa`

## Directory structure

```
Elixer Labs/
├── index.html              # storefront homepage
├── css/style.css
├── js/script.js             # has editable constants at top: DISCORD_HANDLE, DISCORD_INVITE_URL, CASHAPP_TAG
├── listings/                # individual account listing pages (account-2.html ... account-7.html)
├── Accounts/                # screenshots for each account (Account 1 ... Account 7)
├── CNAME                    # custom domain config (GitHub Pages)
└── discord-bot/              # the Discord bot, deployed separately to Railway
    ├── src/
    │   ├── index.js          # main bot logic — all slash commands, button handlers, events
    │   ├── deploy-commands.js # registers slash commands with Discord (run after adding/changing commands)
    │   └── webhook.js         # standalone helper for posting to a Discord webhook (not currently wired into anything)
    ├── data/
    │   ├── listings.json      # the bot's copy of account data — MUST be kept in sync with index.html manually
    │   └── discount-cooldowns.json  # runtime state for /discount, gitignored
    ├── .env                  # REAL secrets, gitignored, never committed
    ├── .env.example           # template showing what vars are needed
    ├── package.json
    └── README.md              # setup instructions for the bot specifically
```

## The website

Static HTML/CSS/JS storefront. No build step. Listings are hand-coded in `index.html` and mirrored in `discord-bot/data/listings.json` for the bot — **if you add/remove/reprice an account, update both places.**

Key site behaviors:
- FAQ "payment methods" answer and "How It Works" step 2 mention Cash App.
- `js/script.js` injects the Cash App tag into the FAQ via `#cashapp-tag` element, and the Discord invite link/handle into the footer — edit the constants at the top of that file, not the HTML, to change these.

## The Discord bot

**Discord server (guild) ID:** `1554283050349629590`
**Discord application ID:** `1554288029563224195`
**Bot account:** originally "Elixir Labs#3060", at some point its *username* changed to **"Elixir brewer"** (not just a nickname — confirmed in Railway logs and Discord's member list). Cause was never determined — possibly fallout from the settings-reset incident described below. Cosmetic only, doesn't affect function. Flagged to the user, never fixed.

### Slash commands (all in `discord-bot/src/index.js`)

| Command | What it does |
|---|---|
| `/listings` | Posts an embed of every account for sale, pulled from `listings.json`. Public reply. |
| `/buy` | Picks an account from a dropdown, replies **ephemeral** (private) with a `cash.app/$heehehaaa/<price>` link for the exact price. Purple embed. |
| `/support` | Replies ephemeral, pointing the user at the `#support-ticket` channel (uses `SUPPORT_TICKET_CHANNEL_ID` env var). |
| `/question` | Smart local query & inventory search engine answering questions about safety, Cash App, delivery, 5-day warranty, and inventory lookups (cheapest account, KT16, evolutions, etc.). Instant, zero API cost, no Anthropic billing required. |
| `/faq` | Posts an embed of frequently asked questions covering safety, payment methods, delivery speed, and warranty. |
| `/website` | Posts a storefront embed with a direct link and button to `https://elixirlabs.store`. |
| `/setup-website` | **Staff only** (`ManageGuild` permission required). Posts the official website link panel in the current channel (used for `#website`). |
| `/discount` | 1% chance of a 25% off code, 2-hour cooldown per user. State stored in `discount-cooldowns.json`. |
| `/setup-verify` | **Staff only** (`ManageGuild` permission required). Posts a "Verify" button panel in the current channel. |

### Other bot behavior

- **@mention or DM:** bot replies with a canned message pointing to the slash commands above (no AI involved — this is NOT the same as `/question`).
- **New ticket channels:** `channelCreate` listener detects channels named `ticket-*` (created by the third-party **Ticket Tool** bot) and auto-posts a purple embed listing `/listings`, `/buy`, `/question` as things the buyer can do while waiting for staff.
- **Verify button:** clicking "Verify" (posted by `/setup-verify`) creates the `Verified` role if it doesn't exist yet, and assigns it to the clicker. Ephemeral confirmation either way (success or "already verified").

### Required environment variables (`discord-bot/.env`, gitignored — real values are only in that file, not repeated here)

- `DISCORD_TOKEN` — bot token from Discord Developer Portal
- `DISCORD_CLIENT_ID` = `1554288029563224195`
- `ANTHROPIC_API_KEY` — created in Anthropic console, named `elixir-labs-discord-bot`, scoped to "Default workspace", no expiration
- `SUPPORT_TICKET_CHANNEL_ID` = `1554311944062640128` (the `#support-ticket` channel)
- `CASHAPP_TAG` = `heehehaaa` (no `$` prefix in the env var, code adds it)
- `SUPPORT_CHANNEL_ID` — optional, unset. If set, bot answers every message in that channel without needing @mention.
- `DISCORD_WEBHOOK_URL` — optional, set but unused by any current feature.

## Discord server structure (roles & channels)

Categories and their access:

- **Welcome** (open to everyone, including unverified): `#verify`, `#rules`, `#faq`
- **Important** (private — gated): `#announcements`, `#terms-of-service`, `#website`, `#stock`, `#deals`. Roles with access: `support staff` (Administrator), `Ticket Tool`, **`Verified`** (added by us).
- **Support** (private — gated): `#support-ticket` (plus dynamically-created `ticket-NNNN` channels from Ticket Tool). Roles with access: `support staff`, `Ticket Tool`, **`Verified`** (added by us).

Pre-existing roles the user already had set up (not created by us, purpose/intended use unclear — a tiered customer system, by the look of it): `| Owner`, `Elixer Brewer`, `| Manager`, `| Customer`, `| Member`.

Role **`Verified`** was created by the bot itself (via `/setup-verify` → button click → auto-create-if-missing logic).

The bot's own role is **`support staff`**, which carries **Administrator** server-wide. This was a deliberate tradeoff: it was the only role Ticket Tool already auto-grants access to new ticket channels, and giving the bot that role was simpler than reconfiguring Ticket Tool's own settings. The user explicitly chose this over a narrower-permission alternative.

## Deployment (Railway)

The bot runs 24/7 on **Railway**, not on any PC. Railway auto-deploys from GitHub on every push to `main`.

- Railway project: **jubilant-curiosity** → service **elixir-labs**
- Dashboard URL: `https://railway.com/project/3f11182b-766a-4eaa-9cd7-de0a64af714e/service/722cef44-4fb3-4ecd-90e9-69724162a642`
- **Root Directory** is set to `/discord-bot` (critical — without this Railway deploys the *website* as a static site instead of running the bot; this happened once and had to be fixed).
- All 5 required env vars (above) are set in Railway's Variables tab, mirroring `.env`.
- Railway is on the **free Trial plan**: $5.00 credit, originally ~24 days from Oct 10, 2026. **Once it runs out, the bot goes offline** unless billing is added (a payment step the user has to do themselves — Claude does not enter payment info).
- To push a code change live: edit → commit → `git push origin main` → Railway auto-builds and redeploys (usually live within ~30–60 seconds). No manual Railway UI steps needed for code changes. Slash command *definition* changes (new commands, changed options) additionally require running `npm run deploy-commands` from `discord-bot/` once.

## Known issues / things to watch

1. **`/question` fixed & upgraded.** Switched to an intelligent, zero-cost local search and FAQ responder that handles safety, payment methods, delivery speed, warranty, and inventory searches (cheapest, maxed, KT16, etc.) without requiring external Anthropic API credits. `ANTHROPIC_API_KEY` is optional so the bot will never fail to start on missing/unfunded keys.
2. **Discord Developer Portal settings reverted once already**, unprompted — "Message Content Intent" and "Public Bot" both silently flipped back to their old values between sessions, which crashed the bot (`Error: Used disallowed intents`) until caught and re-fixed. Cause unknown. If the bot goes offline again, **check Developer Portal → Bot page → Privileged Gateway Intents → Message Content Intent is ON** as a first troubleshooting step.
3. **Railway Trial credit will run out** (~24 days from Oct 10, 2026, less if usage is heavy). Needs billing added on Railway before then to stay online.
4. **Bot's displayed username is "Elixir brewer"**, not "Elixir Labs" — cosmetic oddity, never resolved, not worth chasing unless it bothers you.
5. **`discord-bot/src/webhook.js`** exists (a helper for posting to a Discord webhook) but isn't called from anywhere — leftover scaffolding, not a bug.
6. Only run the bot in **one place at a time**. It's on Railway now; don't also run `npm start` locally while Railway is running the same `DISCORD_TOKEN` — causes duplicate/conflicting connections.

## How to make common changes going forward

- **Reprice/add/remove an account:** edit `index.html` AND `discord-bot/data/listings.json`, then commit + push (website is static-hosted; bot picks up the new file on its next Railway redeploy).
- **Add a new slash command:** edit `discord-bot/src/index.js` (handler) and `discord-bot/src/deploy-commands.js` (definition), commit + push, then run `npm run deploy-commands` once from `discord-bot/` locally (needs `discord-bot/.env` filled in).
- **Check bot is alive:** Railway dashboard → elixir-labs service → Deployments → should say "ACTIVE" / "Online". Deploy Logs should show `Elixir Labs bot logged in as ...` near the top of the current deployment's log.
- **Test changes live:** after a Railway redeploy finishes, go to the Discord server and run the relevant slash command, or create a test ticket via the `#support-ticket` → Create Ticket button.
