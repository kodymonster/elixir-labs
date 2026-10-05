require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const listings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "listings.json"), "utf8"),
);

const commands = [
  new SlashCommandBuilder()
    .setName("listings")
    .setDescription("Show all Clash Royale accounts currently for sale"),
  new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Get a Cash App payment link for an account")
    .addStringOption((opt) =>
      opt
        .setName("account")
        .setDescription("Which account do you want to buy?")
        .setRequired(true)
        .addChoices(
          ...listings.map((l) => ({
            name: `${l.title} — ${l.price}`,
            value: String(l.id),
          })),
        ),
    ),
  new SlashCommandBuilder()
    .setName("support")
    .setDescription("Open a support ticket with staff"),
  new SlashCommandBuilder()
    .setName("question")
    .setDescription("Ask a question about the accounts for sale")
    .addStringOption((opt) =>
      opt
        .setName("question")
        .setDescription("What do you want to know?")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("discount")
    .setDescription("Try your luck for 25% off (1% chance, one try per 2 hours)"),
].map((c) => c.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  if (!process.env.DISCORD_CLIENT_ID) {
    console.error("Missing DISCORD_CLIENT_ID in .env");
    process.exit(1);
  }
  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
      body: commands,
    });
    console.log("Slash commands registered. They can take up to an hour to show up everywhere the first time.");
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exit(1);
  }
})();
