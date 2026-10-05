# Elixir Labs Discord Bot

A support bot for the Elixir Labs Discord server. Slash commands are grounded in `data/listings.json`, so it never invents stats; `/question` is the only command that costs API credits.

## What it does

- `/listings` slash command posts a summary of every account currently for sale.
- `/buy` slash command replies privately with a Cash App payment link (`cash.app/$tag/<price>`) for the exact account and price picked — the amount always comes straight from `data/listings.json`.
- `/question` slash command answers a free-form question about the accounts using Claude, grounded in `data/listings.json` so it won't invent stats or prices. Requires Anthropic API credits.
- `/support` slash command replies privately pointing the user at the Ticket Tool support channel.
- `/discount` slash command — small chance of a 25% off code, with a per-user cooldown.
- Replies with a canned pointer to the commands above when @mentioned anywhere, DMed, or messaged in a dedicated support channel (if you set one).

## 1. Create the Discord bot

1. Go to https://discord.com/developers/applications -> **New Application**.
2. Under **Bot**, click **Reset Token** and copy it — this is `DISCORD_TOKEN`.
3. Under **Bot**, enable **Message Content Intent** (required — the bot can't read message text without it).
4. Under **General Information**, copy the **Application ID** — this is `DISCORD_CLIENT_ID`.
5. Under **OAuth2 -> URL Generator**: check `bot` and `applications.commands` scopes, then under bot permissions check `Send Messages` and `Read Message History`. Open the generated URL to invite the bot to your server.

## 2. Get an Anthropic API key

Create one at https://console.anthropic.com/settings/keys — this is `ANTHROPIC_API_KEY`. `/question` won't work until the account has credits (console.anthropic.com -> Billing -> Add funds).

## 3. Configure

```bash
cp .env.example .env
```

Fill in `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `ANTHROPIC_API_KEY`, `SUPPORT_TICKET_CHANNEL_ID` (the channel `/support` points to — right-click it with Developer Mode on -> Copy Channel ID), and `CASHAPP_TAG` (your Cash App tag, without the leading `$` — e.g. `heehehaaa` for `$heehehaaa`). `SUPPORT_CHANNEL_ID` is optional — set it if you want the bot to answer every message in one specific channel without needing an @mention.

## 4. Run it locally (to test)

```bash
npm install
npm run deploy-commands   # registers the slash commands — run once, and again whenever you add commands or change listings.json
npm start
```

Then in Discord, run `/listings`, `/buy`, `/question`, or `/support`, or @mention the bot / DM it.

## 5. Deploy so it runs 24/7

Your PC doesn't need to stay on if you deploy this to a small always-on host. Railway is the simplest option:

1. Push this `discord-bot` folder to its own GitHub repo (or a subfolder of one).
2. Go to https://railway.app, sign in, **New Project -> Deploy from GitHub repo**, pick the repo.
3. If the bot lives in a subfolder, set the Railway service's **Root Directory** to `discord-bot`.
4. Under the service's **Variables** tab, add `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `ANTHROPIC_API_KEY`, `SUPPORT_TICKET_CHANNEL_ID`, `CASHAPP_TAG`, and `SUPPORT_CHANNEL_ID` (same values as your `.env`).
5. Railway auto-detects Node and runs `npm start`. Deploy, then check the logs for `Elixir Labs bot logged in as ...`.
6. Run `npm run deploy-commands` once from your own machine (with the same `.env`) to register the slash commands — this is a one-time setup step, not something that needs to run continuously.

Other hosts that work the same way: Render (Background Worker), Fly.io, or any small VPS with Node.js installed and `pm2` or a systemd service to keep it running.

## Keeping listings in sync with the website

`data/listings.json` is a separate copy of the account data shown on the Elixir Labs site (`index.html`). When you add, remove, or reprice a listing on the site, update the matching entry here too — the bot only knows what's in this file.
