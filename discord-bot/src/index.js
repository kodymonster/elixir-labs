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

const REQUIRED_ENV = ["DISCORD_TOKEN", "CASHAPP_TAG", "ANTHROPIC_API_KEY", "SUPPORT_TICKET_CHANNEL_ID"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const listings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "listings.json"), "utf8"),
);

const CASHAPP_TAG = process.env.CASHAPP_TAG.replace(/^\$/, "");
const SUPPORT_TICKET_CHANNEL_ID = process.env.SUPPORT_TICKET_CHANNEL_ID;

function cashAppPayLink(priceStr) {
  const amount = priceStr.replace(/[^0-9.]/g, "");
  return `https://cash.app/$${CASHAPP_TAG}/${amount}`;
}

const anthropic = new Anthropic();
const QUESTION_MODEL = "claude-opus-5";

function listingsBlock() {
  return listings
    .map(
      (l) =>
        `- "${l.title}" — ${l.price} — Trophies: ${l.trophies}, King Tower: ${l.kingTower}, Warranty: ${l.warranty}, Delivery: ${l.delivery}. ${l.notes}`,
    )
    .join("\n");
}

function buildQuestionSystemPrompt() {
  return `You are the support assistant for Elixir Labs, a small storefront that sells pre-leveled Clash Royale accounts.

Answer the buyer's question about the accounts currently for sale, pricing, warranty, delivery, or how buying works. Be friendly, concise, and match the site's tone (casual, no corporate fluff). Keep it to a few sentences.

CURRENT LISTINGS (this is the only inventory — do not invent accounts, stats, or prices that aren't listed here):
${listingsBlock()}

RULES:
- Never invent stats, prices, or accounts not in the listings above. If asked about an account that isn't listed, say it's not currently available.
- If asked how to buy or pay: tell them to run /buy and pick the account, which gives a Cash App payment link for the exact price.
- If asked for human help, a bug, or anything you can't answer from the listings: tell them to run /support to open a ticket.
- If asked whether it's safe: accounts include full login access, and buyers are walked through securing the account with a new email/password immediately after purchase.
- Never make up a payment link or amount yourself, and never send credentials yourself.`;
}

async function answerQuestion(question) {
  const response = await anthropic.messages.create({
    model: QUESTION_MODEL,
    max_tokens: 512,
    system: buildQuestionSystemPrompt(),
    output_config: { effort: "low" },
    messages: [{ role: "user", content: question }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text?.trim() || "Sorry, I couldn't come up with a reply to that.";
}

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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const GREETING_REPLY =
  "Hey! Run `/listings` to see what's in stock, `/buy` for a Cash App payment link, `/question` to ask me anything about the accounts, or `/support` to open a ticket with staff.";

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

  await message.reply(GREETING_REPLY);
});

client.on("channelCreate", async (channel) => {
  if (!channel.isTextBased?.() || channel.isDMBased?.()) return;
  if (!/^ticket-/i.test(channel.name)) return;

  const embed = new EmbedBuilder()
    .setTitle("While you wait for staff...")
    .setColor(0x8b5cf6)
    .setDescription(
      "Here's what I can help with in the meantime:\n\n" +
        "`/listings` — see every account currently for sale\n" +
        "`/buy` — get a Cash App payment link for an account\n" +
        "`/question` — ask me anything about the accounts",
    );

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`Couldn't post ticket welcome message in #${channel.name}:`, error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "listings") {
    const embed = new EmbedBuilder()
      .setTitle("Elixir Labs — Available Accounts")
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

  if (interaction.commandName === "buy") {
    const id = Number(interaction.options.getString("account"));
    const listing = listings.find((l) => l.id === id);

    if (!listing) {
      await interaction.reply({
        content: "Couldn't find that account — it may have sold already. Run /listings to see what's in stock.",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Pay for ${listing.title}`)
      .setColor(0x8b5cf6)
      .setDescription(
        `**Price:** ${listing.price}\n\n` +
          `**Pay here:** ${cashAppPayLink(listing.price)}\n` +
          `Cash App tag: $${CASHAPP_TAG}\n\n` +
          `Once you've sent payment, DM a screenshot here and we'll get your login credentials and email access sent over right away.`,
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (interaction.commandName === "support") {
    await interaction.reply({
      content: `Need help? Open a ticket in <#${SUPPORT_TICKET_CHANNEL_ID}> and staff will get to you.`,
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "question") {
    const question = interaction.options.getString("question");
    await interaction.deferReply();

    try {
      const answer = await answerQuestion(question);
      await interaction.editReply(answer);
    } catch (error) {
      console.error("Error answering question:", error);
      if (error instanceof Anthropic.RateLimitError) {
        await interaction.editReply("I'm getting a lot of questions right now — try again in a moment.");
      } else {
        await interaction.editReply(
          "Couldn't answer that right now — run /support to open a ticket with staff instead.",
        );
      }
    }
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
  console.log(`Elixir Labs bot logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
