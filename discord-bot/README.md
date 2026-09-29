# Elixer Labs Discord Bot

An AI-powered support bot for the Elixer Labs Discord server. It answers questions about the accounts currently for sale (pricing, trophies, warranty, delivery, how buying works) using Claude, grounded in `data/listings.json` so it never invents stats.

## What it does

- Replies when @mentioned anywhere, in DMs, or in a dedicated support channel (if you set one).
- Keeps a short rolling conversation history per channel so follow-up questions make sense.
- `/listings` slash command posts a summary of every account currently for sale.
- Refuses to invent accounts/prices not in `data/listings.json`, and always hands off payment/credential steps to a human.

## 1. Create the Discord bot

1. Go to https://discord.com/developers/applications -> **New Application**.
2. Under **Bot**, click **Reset Token** and copy it — this is `DISCORD_TOKEN`.
3. Under **Bot**, enable **Message Content Intent** (required — the bot can't read message text without it).
4. Under **General Information**, copy the **Application ID** — this is `DISCORD_CLIENT_ID`.
5. Under **OAuth2 -> URL Generator**: check `bot` and `applications.commands` scopes, then under bot permissions check `Send Messages`, `Read Message History`, and `Use Slash Commands`. Open the generated URL to invite the bot to your server.

## 2. Get an Anthropic API key

Create one at https://console.anthropic.com/settings/keys — this is `ANTHROPIC_API_KEY`.

## 3. Configure

```bash
cp .env.example .env
```

Fill in `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and `ANTHROPIC_API_KEY`. `SUPPORT_CHANNEL_ID` is optional — set it if you want the bot to answer every message in one specific channel without needing an @mention (right-click the channel with Developer Mode on -> Copy Channel ID).

## 4. Run it locally (to test)

```bash
npm install
npm run deploy-commands   # registers the /listings slash command — run once, and again whenever you add commands
npm start
```

Then in Discord, @mention the bot or DM it with a question, or run `/listings`.

## 5. Deploy so it runs 24/7

Your PC doesn't need to stay on if you deploy this to a small always-on host. Railway is the simplest option:

1. Push this `discord-bot` folder to its own GitHub repo (or a subfolder of one).
2. Go to https://railway.app, sign in, **New Project -> Deploy from GitHub repo**, pick the repo.
3. If the bot lives in a subfolder, set the Railway service's **Root Directory** to `discord-bot`.
4. Under the service's **Variables** tab, add `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `ANTHROPIC_API_KEY`, and `SUPPORT_CHANNEL_ID` (same values as your `.env`).
5. Railway auto-detects Node and runs `npm start`. Deploy, then check the logs for `Elixer Labs bot logged in as ...`.
6. Run `npm run deploy-commands` once from your own machine (with the same `.env`) to register `/listings` — this is a one-time setup step, not something that needs to run continuously.

Other hosts that work the same way: Render (Background Worker), Fly.io, or any small VPS with Node.js installed and `pm2` or a systemd service to keep it running.

## Keeping listings in sync with the website

`data/listings.json` is a separate copy of the account data shown on the Elixer Labs site (`index.html`). When you add, remove, or reprice a listing on the site, update the matching entry here too — the bot only knows what's in this file.
