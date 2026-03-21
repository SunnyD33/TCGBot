import dotenv from 'dotenv';
dotenv.config();

import { Client, Events, GatewayIntentBits } from 'discord.js';
import storage from './storage.js';
import tcgService from './tcgService.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);

  setInterval(async () => {
    console.log('Running periodic alert check...');
    const alerts = storage.getTrackedAlerts();
    const alertChannels = storage.getAlertChannels();

    if (!alertChannels || alertChannels.length === 0) {
      console.log('No alert channels set.');
      return;
    }

    if (alerts.length === 0) {
      console.log('No tracked products');
      return;
    }

    for (const alert of alerts) {
      try {
        const data = await tcgService.getProductData(alert.tcgplayerId);
        console.log(
          `Checking alert: currentPrice=${data.currentPrice}, targetPrice=${alert.targetPrice}`
        );
        if (data.currentPrice <= alert.targetPrice) {
          for (const channelId of alertChannels) {
            try {
              const channel = await client.channels.fetch(channelId.channelId);
              if (!channel) {
                console.log('Channel not found:', channelId);
                continue;
              } else if (channel && channelId.isMuted) {
                console.log(
                  `Channel ${channelId.channelId} is currently muted`
                );
                continue;
              }
              await channel.send(
                `@everyone 🔔 **${data.name}** has dropped to $${data.currentPrice} (target: $${alert.targetPrice})!`
              );
              console.log(`Alert sent to channel ${channelId.channelId}`);
            } catch (err) {
              console.error('Error fetching or sending to channel:', err);
            }
          }
        }
      } catch (error) {
        console.error('Error checking tracked alert:', error);
      }
    }
  }, 20 * 1000); // 20 seconds for testing, change to 4 * 60 * 60 * 1000 for production
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    const focusedOption = interaction.options.getFocused(true);

    // ===== AUTOCOMPLETE =====

    // price autocompletion
    if (
      interaction.commandName === 'price' &&
      focusedOption.name === 'product'
    ) {
      const products = storage.getProducts();

      // Build choices with both name and ID for better matching
      const choices = products.map((p) => {
        const cached = storage.getCachedProduct(p.tcgplayerId);
        return {
          name: cached ? `${cached.name} (${p.tcgplayerId})` : p.tcgplayerId,
          value: p.tcgplayerId,
        };
      });

      // Filter by user input (matches either name or ID)
      const input = focusedOption.value.toLowerCase();
      const filtered = choices.filter(
        (choice) =>
          choice.name.toLowerCase().includes(input) ||
          choice.value.toLowerCase().includes(input)
      );

      await interaction.respond(filtered.slice(0, 25));
      return;
    }

    // track autocompletion
    if (
      interaction.commandName === 'track' &&
      focusedOption.name === 'product'
    ) {
      const products = storage.getProducts();
      const choices = products.map((p) => {
        const cached = storage.getCachedProduct(p.tcgplayerId);
        return {
          name: cached ? `${cached.name} (${p.tcgplayerId})` : p.tcgplayerId,
          value: p.tcgplayerId,
        };
      });
      const input = focusedOption.value.toLowerCase();
      const filtered = choices.filter(
        (choice) =>
          choice.name.toLowerCase().includes(input) ||
          choice.value.toLowerCase().includes(input)
      );
      await interaction.respond(filtered.slice(0, 25));
      return;
    }

    //delete autocompletion
    if (
      interaction.commandName === 'delete' &&
      focusedOption.name === 'product-id'
    ) {
      const products = storage.getProducts();
      const choices = products.map((p) => {
        const cached = storage.getCachedProduct(p.tcgplayerId);
        return {
          name: cached ? `${cached.name} (${p.tcgplayerId})` : p.tcgplayerId,
          value: p.tcgplayerId,
        };
      });
      const input = focusedOption.value.toLowerCase();
      const filtered = choices.filter(
        (choice) =>
          choice.name.toLowerCase().includes(input) ||
          choice.value.toLowerCase().includes(input)
      );
      await interaction.respond(filtered.slice(0, 25));
      return;
    }

    // untrack autocompletion
    if (
      interaction.commandName === 'untrack' &&
      focusedOption.name === 'product'
    ) {
      const products = storage.getProducts();
      const choices = products.map((p) => {
        const cached = storage.getCachedProduct(p.tcgplayerId);
        return {
          name: cached ? `${cached.name} (${p.tcgplayerId})` : p.tcgplayerId,
          value: p.tcgplayerId,
        };
      });
      const input = focusedOption.value.toLowerCase();
      const filtered = choices.filter(
        (choice) =>
          choice.name.toLowerCase().includes(input) ||
          choice.value.toLowerCase().includes(input)
      );
      await interaction.respond(filtered.slice(0, 25));
      return;
    }

    // Update target autocompletion
    if (
      interaction.commandName === 'update-target' &&
      focusedOption.name === 'product'
    ) {
      const products = storage.getProducts();
      const choices = products.map((p) => {
        const cached = storage.getCachedProduct(p.tcgplayerId);
        return {
          name: cached ? `${cached.name} (${p.tcgplayerId})` : p.tcgplayerId,
          value: p.tcgplayerId,
        };
      });
      const input = focusedOption.value.toLowerCase();
      const filtered = choices.filter(
        (choice) =>
          choice.name.toLowerCase().includes(input) ||
          choice.value.toLowerCase().includes(input)
      );
      await interaction.respond(filtered.slice(0, 25));
      return;
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;

  console.log(`Command received: ${interaction.commandName}`);

  try {
    // Add product command
    if (interaction.commandName === 'add') {
      const tcgplayerId = interaction.options.getString('product-id');
      console.log(`Adding product: ${tcgplayerId}`);

      await interaction.deferReply();
      console.log('Reply deferred');

      try {
        console.log('Fetching product data from API...');
        const productData = await tcgService.getProductData(tcgplayerId);
        console.log('Product data received:', productData.name);

        console.log('Adding to storage...');
        const result = storage.addProduct(tcgplayerId);
        console.log('Storage result:', result);

        await interaction.editReply(result.message + ` - ${productData.name}`);
      } catch (error) {
        console.error('Error in add product command:', error);
        await interaction.editReply('❌ Could not find product with that ID!');
      }
    }
  } catch (error) {
    console.error('Fatal error in interaction handler:', error);

    // Try to respond if we haven't already
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred!',
        ephemeral: true,
      });
    } else if (interaction.deferred) {
      await interaction.editReply('❌ An error occurred!');
    }
  }

  if (interaction.commandName === 'delete') {
    const tcgplayerId = interaction.options.getString('product-id');
    console.log(`Removing product: ${tcgplayerId}`);

    await interaction.deferReply();

    const result = storage.removeProduct(tcgplayerId);

    await interaction.editReply(result.message);
    return;
  }

  // Price command
  if (interaction.commandName === 'price') {
    const tcgplayerId = interaction.options.getString('product');

    await interaction.deferReply();

    try {
      const data = await tcgService.getProductData(tcgplayerId);

      await interaction.editReply(
        `**${data.name}**\n` +
          `Product ID: ${data.tcgplayerId}\n` +
          `Current Price: **$${data.currentPrice}**\n` +
          `Last Updated: ${new Date(data.lastChecked).toLocaleString()}`
      );
    } catch (error) {
      await interaction.editReply('❌ Error fetching price!');
    }
  }

  // List tracked products
  if (interaction.commandName === 'products') {
    const products = storage.getProducts();
    const trackedAlerts = storage.getTrackedAlerts();

    if (products.length === 0) {
      await interaction.reply('No products added yet!');
      return;
    }

    await interaction.deferReply();

    try {
      let message = '**Products (Tracked and Untracked):**\n\n';

      for (const product of products) {
        let cached = storage.getCachedProduct(product.tcgplayerId);

        if (!storage.isCacheFresh(product.tcgplayerId)) {
          cached = await tcgService.getProductData(product.tcgplayerId, true);
        }

        // Check if this product is tracked
        const isTracked = trackedAlerts.some(
          (alert) => alert.tcgplayerId === product.tcgplayerId
        );

        const trackedMark = isTracked ? ' (T)' : '';

        if (cached) {
          message += `• ${cached.name} - ${cached.tcgplayerId} - $${cached.currentPrice}${trackedMark}\n`;
        } else {
          message += `• TCGPlayer ID: ${product.tcgplayerId}${trackedMark}\n`;
        }
      }

      await interaction.editReply(message);
    } catch (error) {
      await interaction.editReply('❌ Error listing products!');
    }
  }

  if (interaction.commandName === 'track') {
    const product_id = interaction.options.getString('product');
    const target_price = interaction.options.getNumber('target');

    await interaction.deferReply();

    try {
      // Check if product exists
      const productData = await tcgService.getProductData(product_id);

      const result = storage.trackProduct(product_id, target_price);

      await interaction.editReply(
        result.success
          ? `🔔 Tracking **${productData.name}** for price drop below $${target_price}.`
          : `❌ ${result.message}`
      );
    } catch (error) {
      await interaction.editReply('❌ Could not track product!');
    }
  }

  if (interaction.commandName === 'untrack') {
    const product_id = interaction.options.getString('product');
    console.log(`Untracking product: ${product_id}`);

    await interaction.deferReply();

    const result = storage.removeTrackedAlerts(product_id);
    await interaction.editReply(result.message);
    return;
  }

  if (interaction.commandName === 'update-target') {
    const product_id = interaction.options.getString('product');
    const new_target_price = interaction.options.getNumber('target');
    console.log(`Updating target price for product: ${product_id}`);

    await interaction.deferReply();

    const result = storage.updateTargetPrice(product_id, new_target_price);
    await interaction.editReply(result.message);
    return;
  }

  if (interaction.commandName === 'setalertchannel') {
    //Admin permission required
    if (!interaction.memberPermissions.has('Administrator')) {
      await interaction.reply({
        content: `X you need Administrator permission to use this command.`,
        flags: 'Ephemeral',
      });
      return;
    }
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;
    storage.setAlertChannel(channel.id);
    await interaction.reply(`Alerts will be sent to ${channel}.`);
  }

  if (interaction.commandName === 'list-channels') {
    const alertChannels = storage.getAlertChannels();

    if (!alertChannels.length) {
      await interaction.reply('No alert channels are set.');
      return;
    }

    // Fetch channel names
    const channelNames = [];
    for (const channelObj of alertChannels) {
      try {
        const channel = await client.channels.fetch(channelObj.channelId);
        if (channel && channel.name) {
          channelNames.push(
            `#${channel.name}` + (channelObj.isMuted ? ' (muted)' : '')
          );
        } else {
          channelNames.push(`Unknown Channel (${channelObj.channelId})`);
        }
      } catch (err) {
        channelNames.push(`Unknown Channel (${channelObj.channelId})`);
      }
    }

    const message = `**Alert Channels:**\n${channelNames.join('\n')}`;
    await interaction.reply(message);
  }

  if (interaction.commandName === 'mute') {
    //Admin permission required
    if (!interaction.memberPermissions.has('Administrator')) {
      await interaction.reply({
        content: `X you need Administrator permission to use this command.`,
        flags: 'Ephemeral',
      });
      return;
    }

    await interaction.deferReply();

    const channelID = interaction.channelId;
    const channelName = interaction.channel.name;

    const result = storage.unmuteChannel(channelID, channelName);
    await interaction.editReply(result.message);

    return;
  }

  if (interaction.commandName === 'unmute') {
    //Admin permission required
    if (!interaction.memberPermissions.has('Administrator')) {
      await interaction.reply({
        content: `X you need Administrator permission to use this command.`,
        flags: 'Ephemeral',
      });
      return;
    }

    await interaction.deferReply();

    const channelID = interaction.channelId;
    const channelName = interaction.channel.name;

    const result = storage.unmuteChannel(channelID, channelName);
    await interaction.editReply(result.message);

    return;
  }
});

client.login(process.env.DISCORD_TOKEN);
