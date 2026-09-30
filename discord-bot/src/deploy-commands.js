require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("listings")
    .setDescription("Show all Clash Royale accounts currently for sale"),
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
