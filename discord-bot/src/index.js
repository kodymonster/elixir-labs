require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
} = require("discord.js");
const Anthropic = require("@anthropic-ai/sdk");

const REQUIRED_ENV = ["DISCORD_TOKEN", "ANTHROPIC_API_KEY"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const listings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "listings.json"), "utf8"),
);

const DISCOUNT_WIN_CHANCE = 0.01; // 1%
const DISCOUNT_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const cooldownsPath = path.join(__dirname, "..", "data", "discount-cooldowns.json");

function loadCooldowns() {
  try {
    return JSON.parse(fs.readFileSync(cooldownsPath, "utf8"));
  } catch {
    return {};
  }
}

function saveCooldowns(cooldowns) {
  fs.writeFileSync(cooldownsPath, JSON.stringify(cooldowns, null, 2));
}

const anthropic = new Anthropic();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const MODEL = "claude-opus-5";
const MAX_HISTORY_TURNS = 10; // user+assistant messages kept per channel
const DISCORD_MESSAGE_LIMIT = 2000;

// In-memory per-channel conversation history. Resets on bot restart.
const conversations = new Map();

function listingsBlock() {
  return listings
    .map(
      (l) =>
        `- "${l.title}" — ${l.price} — Trophies: ${l.trophies}, King Tower: ${l.kingTower}, Warranty: ${l.warranty}, Delivery: ${l.delivery}. ${l.notes}`,
    )
    .join("\n");
}

function buildSystemPrompt() {
  return `You are the support assistant for Elixer Labs, a small storefront that sells pre-leveled Clash Royale accounts.

Your job: answer questions about the accounts currently for sale, pricing, warranty, delivery, and how buying works. Be friendly, concise, and match the site's tone (casual, no corporate fluff).

CURRENT LISTINGS (this is the only inventory — do not invent accounts, stats, or prices that aren't listed here):
${listingsBlock()}

HOW BUYING WORKS (tell users this when asked):
1. They message here on Discord saying which account they want.
2. A human confirms availability and sends secure payment details.
3. After payment, login credentials and email access are sent right away.

RULES:
- Never invent stats, prices, or accounts not in the listings above. If someone asks about an account that isn't listed, say it's not currently available.
- You cannot process payments or send account credentials yourself — always hand off to a human for that step by saying something like "let us know you'd like to buy this and someone will get you set up."
- If asked whether it's safe: accounts include full login access, and buyers are walked through securing the account with a new email/password immediately after purchase.
- If asked about payment methods: those are shared once the buyer confirms which account they want.
- Keep replies short — a few sentences, not an essay — this is a Discord chat, not an email.`;
}

function trimHistory(history) {
  const maxEntries = MAX_HISTORY_TURNS * 2;
  if (history.length > maxEntries) {
    history.splice(0, history.length - maxEntries);
  }
}

async function getReply(channelId, userMessage) {
  const history = conversations.get(channelId) ?? [];
  history.push({ role: "user", content: userMessage });
  trimHistory(history);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(),
    output_config: { effort: "low" },
    messages: history,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const reply = textBlock?.text?.trim() || "Sorry, I couldn't come up with a reply to that.";

  history.push({ role: "assistant", content: reply });
  trimHistory(history);
  conversations.set(channelId, history);

  return reply;
}

async function sendChunked(channel, text) {
  for (let i = 0; i < text.length; i += DISCORD_MESSAGE_LIMIT) {
    await channel.send(text.slice(i, i + DISCORD_MESSAGE_LIMIT));
  }
}

function shouldRespond(message) {
  if (message.author.bot) return false;
  if (message.channel.isDMBased()) return true;
  if (
    process.env.SUPPORT_CHANNEL_ID &&
    message.channel.id === process.env.SUPPORT_CHANNEL_ID
  ) {
    return true;
  }
  return client.user && message.mentions.has(client.user);
}

client.on("messageCreate", async (message) => {
  if (!shouldRespond(message)) return;

  const content = message.content
    .replace(new RegExp(`<@!?${client.user.id}>`, "g"), "")
    .trim();
  if (!content) return;

  await message.channel.sendTyping();

  try {
    const reply = await getReply(message.channel.id, content);
    await sendChunked(message.channel, reply);
  } catch (error) {
    console.error("Error generating reply:", error);
    if (error instanceof Anthropic.RateLimitError) {
      await message.reply("I'm getting a lot of questions right now — try again in a moment.");
    } else if (error instanceof Anthropic.AuthenticationError) {
      await message.reply("The bot isn't configured correctly (invalid API key). Let the server owner know.");
    } else {
      await message.reply("Something went wrong answering that — try again in a bit.");
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "listings") {
    const embed = new EmbedBuilder()
      .setTitle("Elixer Labs — Available Accounts")
      .setColor(0x8b5cf6);

    for (const l of listings) {
      embed.addFields({
        name: `${l.title} — ${l.price}`,
        value: `Trophies: ${l.trophies} | King Tower: ${l.kingTower} | Warranty: ${l.warranty} | Delivery: ${l.delivery}\n${l.notes}`,
      });
    }

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (interaction.commandName === "discount") {
    const cooldowns = loadCooldowns();
    const userId = interaction.user.id;
    const lastTry = cooldowns[userId] ?? 0;
    const elapsed = Date.now() - lastTry;

    if (elapsed < DISCOUNT_COOLDOWN_MS) {
      const minutesLeft = Math.ceil((DISCOUNT_COOLDOWN_MS - elapsed) / 60000);
      await interaction.reply({
        content: `You already tried recently — come back in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
        ephemeral: true,
      });
      return;
    }

    cooldowns[userId] = Date.now();
    saveCooldowns(cooldowns);

    const won = Math.random() < DISCOUNT_WIN_CHANCE;
    await interaction.reply(
      won
        ? "🎉 **25% OFF!** DM staff with a screenshot of this to redeem it on your next purchase."
        : "oops, try again",
    );
    return;
  }
});

client.once("clientReady", () => {
  console.log(`Elixer Labs bot logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
