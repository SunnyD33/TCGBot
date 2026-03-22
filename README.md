# TCG Price Tracker Discord Bot

A Discord bot for tracking trading card game (TCG) product prices, sending price alerts, and managing tracked products with slash commands. Built with Node.js and Discord.js.

---

## Features

- **Track TCG Products:** Add products by ID and monitor their prices.
- **Price Alerts:** Get notified in designated channels when a product drops below your target price.
- **Slash Commands:** Intuitive commands for adding, tracking, untracking, deleting, and listing products.
- **Persistent Storage:** Uses a JSON file on a persistent disk (Render or Railway) to store products, alerts, and cache.
- **Channel Management:** Set, mute, or unmute alert channels directly from Discord.

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- A Discord bot application and token
- (Optional) Render or Railway account for hosting

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/TCGBot.git
   cd TCGBot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in your Discord bot token and other required values.

4. **Run the bot locally:**
   ```bash
   npm start
   ```

5. **Register slash commands:**
   - Run the provided registration script or ensure your bot registers commands at startup.

---

## Deployment

- **Render:**  
  Add a persistent disk at `/data` and set your cache file path to `/data/cache.json`.
- **Railway:**  
  Use a Volume plugin mounted at `/data` and set your cache file path accordingly.

Add your environment variables in the platform dashboard.

---

## Usage

- `/add <product-id>` – Add a product to tracking
- `/track <product> <target>` – Track a product and set a price alert
- `/untrack <product>` – Remove a tracked alert
- `/delete <product-id>` – Remove a product from tracking
- `/products` – List all products, with tracked products marked `(T)`
- `/setalertchannel <channel>` – Set the channel for price alerts
- `/mute` and `/unmute` – Mute or unmute alerts in the current channel

---

## License

MIT License