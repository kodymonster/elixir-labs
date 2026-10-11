const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
let Anthropic = null;
try {
  Anthropic = require("@anthropic-ai/sdk");
} catch {
  // Optional dependency
}

const REQUIRED_ENV = ["DISCORD_TOKEN", "CASHAPP_TAG", "SUPPORT_TICKET_CHANNEL_ID"];
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
const WEBSITE_URL = "https://elixirlabs.store";

function cashAppPayLink(priceStr) {
  const amount = priceStr.replace(/[^0-9.]/g, "");
  return `https://cash.app/$${CASHAPP_TAG}/${amount}`;
}

let anthropicClient = null;
if (Anthropic && process.env.ANTHROPIC_API_KEY) {
  try {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  } catch (err) {
    console.warn("Anthropic SDK initialization warning:", err.message);
  }
}

function answerQuestionLocally(query) {
  const q = (query || "").toLowerCase().trim();

  // 0. Website & Storefront query
  if (/\b(website|site|store|storefront|link|url|domain|browse online|webpage)\b/i.test(q)) {
    return {
      title: "🌐 Elixir Labs Official Website",
      description:
        "Check out our full catalog, high-resolution account galleries, and buyer reviews online:\n\n" +
        `👉 **[elixirlabs.store](${WEBSITE_URL})**\n\n` +
        "• High-resolution photo galleries for each account\n" +
        "• Instant Cash App purchase links\n" +
        "• 5-day warranty & instant credential handoff"
    };
  }

  // 1. Safety, Bans, Legitimacy & Security
  if (/\b(safe|safety|legit|legitimate|scam|scammed|ban|banned|trust|trusted|stolen|hacked|recover|recovered|secure|security|real)\b/i.test(q)) {
    return {
      title: "🛡️ Safety & Account Security",
      description:
        "**Buying from Elixir Labs is 100% safe and secure.**\n\n" +
        "• **Full Ownership:** You receive full Supercell ID & email credentials.\n" +
        "• **Handoff Guide:** Staff walks you through switching the email & securing the account to your own details immediately.\n" +
        "• **5-Day Free Warranty:** Every account comes with a 5-day replacement/support warranty for total peace of mind.\n\n" +
        "Run `/listings` to browse stock, or `/support` to chat with staff."
    };
  }

  // 2. Payments & Cash App
  if (/\b(pay|payment|cashapp|cash app|paypal|crypto|card|credit|apple pay|method|methods|how to pay|how do i pay|how to buy|how do i buy|buy|purchase|checkout|cost)\b/i.test(q)) {
    return {
      title: "💳 Payment & How to Buy",
      description:
        `We accept **Cash App only** ($${CASHAPP_TAG}).\n\n` +
        "**How to purchase:**\n" +
        "1. Run `/buy` and pick the account you want.\n" +
        "2. Click the payment link for the exact amount.\n" +
        "3. Send a screenshot of your payment in your ticket or DM.\n" +
        "4. Staff delivers your login details and email access immediately!\n\n" +
        `Ready to buy? Run \`/buy\` or open a ticket in <#${SUPPORT_TICKET_CHANNEL_ID}>.`
    };
  }

  // 3. Delivery & Speed
  if (/\b(delivery|deliver|how long|speed|time|instant|wait|waiting|when do i get|handoff)\b/i.test(q)) {
    return {
      title: "⚡ Delivery Time & Process",
      description:
        "**Delivery is instant upon payment verification!**\n\n" +
        "As soon as you send your Cash App payment confirmation in your support ticket, staff delivers the login email, password, and recovery instructions right away."
    };
  }

  // 4. Warranty, Refunds & Guarantees
  if (/\b(warranty|guarantee|refund|money back|locked|issue|problem|broken|help if)\b/i.test(q)) {
    return {
      title: "🔒 5-Day Free Warranty",
      description:
        "**Every account includes a 5-day free warranty.**\n\n" +
        "If you ever encounter an account or login issue within 5 days of purchase, our staff will troubleshoot or provide a replacement immediately.\n\n" +
        `Need help with an account? Open a ticket in <#${SUPPORT_TICKET_CHANNEL_ID}>.`
    };
  }

  // 5. Discounts & Promo Codes
  if (/\b(discount|code|promo|deal|coupon|cheap|cheaper|sale|percent|luck|roll)\b/i.test(q)) {
    return {
      title: "🎁 Discounts & Deals",
      description:
        "• **Roll the dice:** Run `/discount` for a 1% chance every 2 hours to win **25% off** your next purchase!\n" +
        "• Check our `#deals` channel for active promotions and sales.\n" +
        "• Run `/listings` to see all current account prices."
    };
  }

  // 6. Custom Requests / Specific Cards / Trophies
  if (/\b(custom|request|specific|order|looking for|can you get|future|upcoming|deck|champion|monk|little prince)\b/i.test(q)) {
    return {
      title: "🎯 Custom Accounts & Requests",
      description:
        "Looking for specific cards, evolutions, heroes, or trophy brackets?\n\n" +
        `Open a ticket in <#${SUPPORT_TICKET_CHANNEL_ID}> and tell us what you're looking for. We restock regularly and can source custom accounts!`
    };
  }

  // 7. Human Support & Tickets
  if (/\b(support|ticket|staff|human|talk to|speak to|admin|owner|mod|help|contact)\b/i.test(q)) {
    return {
      title: "🎫 Support & Staff Help",
      description:
        `Need to speak with human staff? Open a ticket in <#${SUPPORT_TICKET_CHANNEL_ID}> and our team will assist you shortly!`
    };
  }

  // 8. Lowest / Cheapest / Budget Accounts
  if (/\b(cheap|cheapest|budget|lowest|least|under|affordable)\b/i.test(q)) {
    const sorted = [...listings].sort((a, b) => {
      const pa = parseFloat(a.price.replace(/[^0-9.]/g, "")) || 0;
      const pb = parseFloat(b.price.replace(/[^0-9.]/g, "")) || 0;
      return pa - pb;
    });
    const cheapest = sorted[0];
    return {
      title: `🏷️ Lowest Priced Account: ${cheapest.title} (${cheapest.price})`,
      description:
        `**Price:** ${cheapest.price}\n` +
        `**Trophies:** ${cheapest.trophies} | **King Tower:** ${cheapest.kingTower}\n` +
        `**Warranty:** ${cheapest.warranty} | **Delivery:** ${cheapest.delivery}\n` +
        `**Details:** ${cheapest.notes}\n\n` +
        `Run \`/buy\` to get this account, or \`/listings\` to see all stock.`
    };
  }

  // 9. Best / Maxed / Highest Trophy Accounts
  if (/\b(best|max|maxed|highest|most|elite|expensive|top|high)\b/i.test(q)) {
    const sorted = [...listings].sort((a, b) => {
      const pa = parseFloat(a.price.replace(/[^0-9.]/g, "")) || 0;
      const pb = parseFloat(b.price.replace(/[^0-9.]/g, "")) || 0;
      return pb - pa;
    });
    const top = sorted[0];
    return {
      title: `👑 Top Tier Account: ${top.title} (${top.price})`,
      description:
        `**Price:** ${top.price}\n` +
        `**Trophies:** ${top.trophies} | **King Tower:** ${top.kingTower}\n` +
        `**Warranty:** ${top.warranty} | **Delivery:** ${top.delivery}\n` +
        `**Details:** ${top.notes}\n\n` +
        `Run \`/buy\` to purchase this account, or \`/listings\` to see all accounts.`
    };
  }

  // 10. Specific Account Lookup by ID or keyword (e.g. "account 2", "account 4", "kt16", "kt12")
  const matchedAccounts = listings.filter((l) => {
    if (q.includes(`account ${l.id}`) || q.includes(`acc ${l.id}`) || q.includes(`#${l.id}`)) return true;
    if (q.includes(l.kingTower.toLowerCase())) return true;
    if (q.includes(l.title.toLowerCase())) return true;
    return false;
  });

  if (matchedAccounts.length > 0) {
    const fields = matchedAccounts.slice(0, 3).map((l) => ({
      name: `${l.title} — ${l.price}`,
      value: `**Trophies:** ${l.trophies} | **Tower:** ${l.kingTower}\n${l.notes}`,
    }));
    return {
      title: `🔍 Accounts Matching Your Query (${matchedAccounts.length} found)`,
      description: "Here are the closest matching accounts in stock:\n\nRun `/buy` to purchase any account.",
      fields,
    };
  }

  // 11. General Fallback
  return {
    title: "💬 Elixir Labs Support & Information",
    description:
      "Here is quick info about Elixir Labs:\n\n" +
      "• **Browse Accounts:** Run `/listings` to see all accounts currently for sale.\n" +
      "• **How to Buy:** Run `/buy` to select an account and get a Cash App payment link.\n" +
      "• **Security:** 100% full email/Supercell ID access transferred to you + **5-day warranty**.\n" +
      `• **Staff Help:** Need something custom or have a question? Open a ticket in <#${SUPPORT_TICKET_CHANNEL_ID}>.\n\n` +
      "_Tip: Ask me about safety, payment methods, delivery speed, warranty, or specific accounts!_"
  };
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

const VERIFIED_ROLE_NAME = "Verified";
const VERIFY_BUTTON_ID = "verify_click";

async function ensureVerifiedRole(guild) {
  const existing = guild.roles.cache.find((r) => r.name === VERIFIED_ROLE_NAME);
  if (existing) return existing;
  return guild.roles.create({
    name: VERIFIED_ROLE_NAME,
    reason: "Verification gate role",
  });
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
  "Hey! Run `/listings` to see what's in stock, `/buy` for a Cash App payment link, `/question` to ask me anything about accounts, pricing, or safety, `/faq` for quick answers, or `/support` to open a ticket with staff.";

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
        "`/question` — ask me anything about accounts, pricing, safety, or delivery\n" +
        "`/faq` — frequently asked questions",
    );

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`Couldn't post ticket welcome message in #${channel.name}:`, error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId !== VERIFY_BUTTON_ID) return;

    const role = await ensureVerifiedRole(interaction.guild);

    if (interaction.member.roles.cache.has(role.id)) {
      await interaction.reply({ content: "You're already verified!", ephemeral: true });
      return;
    }

    try {
      await interaction.member.roles.add(role);
      await interaction.reply({
        content: "You're verified! Welcome to Elixir Labs — check out the channels on the left.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error assigning Verified role:", error);
      await interaction.reply({
        content: "Couldn't verify you right now — let staff know in the support channel.",
        ephemeral: true,
      });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "setup-verify") {
    const role = await ensureVerifiedRole(interaction.guild);

    const embed = new EmbedBuilder()
      .setTitle("Verify to access the server")
      .setColor(0x8b5cf6)
      .setDescription("Click the button below to verify you're human and unlock the rest of Elixir Labs.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(VERIFY_BUTTON_ID).setLabel("Verify").setStyle(ButtonStyle.Success),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({
      content: `Verify panel posted. Role: ${role}`,
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "website") {
    const embed = new EmbedBuilder()
      .setTitle("🌐 Elixir Labs Official Storefront")
      .setColor(0x8b5cf6)
      .setDescription(
        "Browse our full catalog of Clash Royale accounts, high-resolution screenshots, card inventories, and buyer reviews live on our website!\n\n" +
          `👉 **[elixirlabs.store](${WEBSITE_URL})**`,
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Visit Website")
        .setStyle(ButtonStyle.Link)
        .setURL(WEBSITE_URL),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
    return;
  }

  if (interaction.commandName === "setup-website") {
    const embed = new EmbedBuilder()
      .setTitle("🌐 Elixir Labs Official Storefront")
      .setColor(0x8b5cf6)
      .setDescription(
        "Welcome to the official **Elixir Labs** storefront!\n\n" +
          "Visit our website to browse verified Clash Royale accounts with full screenshot galleries, maxed card details, and live pricing.\n\n" +
          `🔗 **Website:** ${WEBSITE_URL}\n\n` +
          "• Full photo galleries for every account\n" +
          "• Instant Cash App purchase links\n" +
          "• 5-day warranty & instant credential handoff",
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Visit Storefront")
        .setStyle(ButtonStyle.Link)
        .setURL(WEBSITE_URL),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({
      content: "Website link panel posted successfully!",
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "listings") {
    const embed = new EmbedBuilder()
      .setTitle("Elixir Labs — Available Accounts")
      .setColor(0x8b5cf6)
      .setDescription(
        `Browse full screenshots & collection details at **[elixirlabs.store](${WEBSITE_URL})**\nRun \`/buy\` to get an instant payment link for any account.`,
      );

    for (const l of listings) {
      embed.addFields({
        name: `${l.title} — ${l.price}`,
        value: `Trophies: ${l.trophies} | King Tower: ${l.kingTower} | Warranty: ${l.warranty} | Delivery: ${l.delivery}\n${l.notes}`,
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("View on Website")
        .setStyle(ButtonStyle.Link)
        .setURL(WEBSITE_URL),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
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

  if (interaction.commandName === "faq") {
    const embed = new EmbedBuilder()
      .setTitle("Elixir Labs — Frequently Asked Questions")
      .setColor(0x8b5cf6)
      .addFields(
        {
          name: "🛡️ Is it safe to buy an account?",
          value: "Yes! You receive 100% full email and Supercell ID access. We guide you through securing the account with your own email and password immediately upon purchase, backed by our **5-Day Free Warranty**.",
        },
        {
          name: "💳 What payment methods do you accept?",
          value: `We accept **Cash App only** ($${CASHAPP_TAG}). Run \`/buy\` to get an instant payment link for the exact listing amount.`,
        },
        {
          name: "⚡ How fast is delivery?",
          value: "Delivery is instant once your Cash App payment confirmation is sent in your support ticket or DM.",
        },
        {
          name: "🎯 Can I request specific cards or trophies?",
          value: `Yes! Open a ticket in <#${SUPPORT_TICKET_CHANNEL_ID}> and staff will help you find or order the exact account you need.`,
        },
        {
          name: "🎁 Do you have discounts?",
          value: "Try `/discount` for a 1% chance every 2 hours to win **25% off** your next purchase! Also check `#deals` for current promos.",
        },
      )
      .setFooter({ text: "Run /listings to browse accounts, /buy to purchase, or /support for staff." });

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (interaction.commandName === "question") {
    const question = interaction.options.getString("question");
    const localAnswer = answerQuestionLocally(question);

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(localAnswer.title)
      .setDescription(localAnswer.description);

    if (localAnswer.fields && localAnswer.fields.length > 0) {
      embed.addFields(localAnswer.fields);
    }

    const shortQ = question.length > 50 ? question.slice(0, 47) + "..." : question;
    embed.setFooter({ text: `Question: "${shortQ}" • Elixir Labs Support` });

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

client.once("clientReady", async () => {
  console.log(`Elixir Labs bot logged in as ${client.user.tag}`);

  try {
    const guild = client.guilds.cache.get("1554283050349629590") || client.guilds.cache.first();
    if (guild) {
      const websiteChannel = guild.channels.cache.find(
        (c) => c.isTextBased?.() && c.name.toLowerCase() === "website",
      );
      if (websiteChannel) {
        const messages = await websiteChannel.messages.fetch({ limit: 10 }).catch(() => null);
        const alreadyPosted = messages && messages.some((m) => m.author.id === client.user.id);
        if (!alreadyPosted) {
          const embed = new EmbedBuilder()
            .setTitle("🌐 Elixir Labs Official Storefront")
            .setColor(0x8b5cf6)
            .setDescription(
              "Welcome to the official **Elixir Labs** storefront!\n\n" +
                "Visit our website to browse verified Clash Royale accounts with full screenshot galleries, maxed card details, and live pricing.\n\n" +
                `🔗 **Website:** ${WEBSITE_URL}\n\n` +
                "• Full photo galleries for every account\n" +
                "• Instant Cash App purchase links\n" +
                "• 5-day warranty & instant credential handoff",
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("Visit Storefront")
              .setStyle(ButtonStyle.Link)
              .setURL(WEBSITE_URL),
          );

          await websiteChannel.send({ embeds: [embed], components: [row] });
          console.log(`Auto-posted website link in #${websiteChannel.name}`);
        }
      }
    }
  } catch (err) {
    console.error("Could not check/auto-post #website channel:", err.message);
  }
});

client.login(process.env.DISCORD_TOKEN);
