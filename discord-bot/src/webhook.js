// Reusable Discord webhook sender.
// Create a webhook: Discord -> Server Settings -> Integrations -> Webhooks -> New Webhook -> Copy Webhook URL.
// Put that URL in .env as DISCORD_WEBHOOK_URL, then:
//
//   const { sendWebhookMessage } = require("./webhook");
//   await sendWebhookMessage({ content: "New order placed!" });

require("dotenv").config();

async function sendWebhookMessage({ content, embeds, username, avatarURL } = {}) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) throw new Error("DISCORD_WEBHOOK_URL is not set in .env");
  if (!content && !embeds) throw new Error("sendWebhookMessage needs content or embeds");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      embeds,
      username,
      avatar_url: avatarURL,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord webhook failed: ${res.status} ${res.statusText} ${body}`);
  }
}

module.exports = { sendWebhookMessage };

// Run directly (`node src/webhook.js`) to send a test message.
if (require.main === module) {
  sendWebhookMessage({ content: "Test message from Elixir Labs webhook." })
    .then(() => console.log("Sent."))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
