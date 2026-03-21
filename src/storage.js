import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE =
  process.env.RENDER_DISK_PATH || path.resolve(__dirname, '../data/cache.json');

class Storage {
  constructor() {
    this.ensureDataFile();
  }

  ensureDataFile() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(
          { products: [], priceCache: {}, trackedAlerts: [] },
          null,
          2
        )
      );
    } else {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        console.error('Could not parse cache.json:', e);
        return;
      }
      if (!data.trackedAlerts) {
        data.trackedAlerts = [];
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('✅ Patched cache.json: added trackedAlerts array.');
      }
    }
  }

  getData() {
    this.ensureDataFile();

    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  }

  saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }

  // ===== PRODUCT TRACKING =====

  getProducts() {
    return this.getData().products;
  }

  addProduct(tcgplayerId) {
    const data = this.getData();

    // Check if tcgplayerId already exists
    if (data.products.find((p) => p.tcgplayerId === tcgplayerId)) {
      return {
        success: false,
        message:
          'Product already added! Try /track to track prices of this product!',
      };
    }

    data.products.push({
      tcgplayerId,
      addedAt: new Date().toISOString(),
    });

    this.saveData(data);
    return { success: true, message: 'Product added to tracking!' };
  }

  getProduct(tcgplayerId) {
    const products = this.getProducts();
    return products.find((p) => p.tcgplayerId === tcgplayerId);
  }

  removeProduct(tcgplayerId) {
    const data = this.getData();
    const initialLength = data.products.length;

    data.products = data.products.filter((p) => p.tcgplayerId !== tcgplayerId);

    if (data.products.length === initialLength) {
      return { success: false, message: 'Product not found' };
    }

    // Remove from price cache
    console.log('Before delete:', Object.keys(data.priceCache));
    delete data.priceCache[tcgplayerId];
    console.log('After delete:', Object.keys(data.priceCache));

    // Remove from tracked alerts
    if (data.trackedAlerts) {
      data.trackedAlerts = data.trackedAlerts.filter(
        (alert) => alert.tcgplayerId !== tcgplayerId
      );
    }

    this.saveData(data);
    return { success: true, message: 'Product removed from tracking!' };
  }

  // ===== PRICE CACHE =====

  // Extract relevant data from JustTCG response
  extractProductData(cardData, priceHistory) {
    const latestPrice = priceHistory[priceHistory.length - 1];

    return {
      id: cardData.id,
      name: cardData.name,
      game: cardData.game,
      set: cardData.set_name,
      tcgplayerId: cardData.tcgplayerId,
      currentPrice: latestPrice.price,
      lastChecked: new Date().toISOString(),
      priceHistory: priceHistory.map((entry) => ({
        date: entry.date,
        price: entry.price,
      })),
    };
  }

  // Update cache for a specific product (using tcgplayerId as key)
  updatePriceCache(tcgplayerId, cardData, priceHistory) {
    const data = this.getData();
    const productData = this.extractProductData(cardData, priceHistory);

    data.priceCache[tcgplayerId] = productData;

    this.saveData(data);
    return productData;
  }

  // Get a specific product from cache
  getCachedProduct(tcgplayerId) {
    const data = this.getData();
    return data.priceCache[tcgplayerId] || null;
  }

  // Check if cache is fresh (within 2 hours by default)
  isCacheFresh(tcgplayerId, maxAgeMs = 2 * 60 * 60 * 1000) {
    const product = this.getCachedProduct(tcgplayerId);
    if (!product) return false;

    const lastChecked = new Date(product.lastChecked);
    const now = new Date();

    return now - lastChecked < maxAgeMs;
  }

  // Get current price from cache
  getCurrentPrice(tcgplayerId) {
    const product = this.getCachedProduct(tcgplayerId);
    return product ? product.currentPrice : null;
  }

  // Get price history from cache
  getPriceHistory(tcgplayerId) {
    const product = this.getCachedProduct(tcgplayerId);
    return product ? product.priceHistory : [];
  }

  // ===== TRACKED ALERTS =====

  trackProduct(tcgplayerId, targetPrice) {
    const data = this.getData();

    // Ensure trackedAlerts exists
    if (!data.trackedAlerts) {
      data.trackedAlerts = [];
    }

    // Prevent duplicate tracking for same product
    const alreadyTracking = data.trackedAlerts.find(
      (alert) => alert.tcgplayerId === tcgplayerId
    );
    if (alreadyTracking) {
      return {
        success: false,
        message:
          'You are already tracking this product! Try /update-target instead',
      };
    }

    data.trackedAlerts.push({
      tcgplayerId,
      targetPrice,
      createdAt: new Date().toISOString(),
    });

    this.saveData(data);
    return { success: true, message: 'Tracking started!' };
  }

  getTrackedAlerts() {
    const data = this.getData();
    return data.trackedAlerts || [];
  }

  removeTrackedAlerts(tcgplayerId) {
    const data = this.getData();

    if (!data.trackedAlerts || data.trackedAlerts.length === 0) {
      return { success: false, message: 'No tracked alerts to remove.' };
    }

    const initialLength = data.trackedAlerts.length;
    data.trackedAlerts = data.trackedAlerts.filter(
      (alert) => alert.tcgplayerId !== tcgplayerId
    );

    if (data.trackedAlerts.length === initialLength) {
      return {
        success: false,
        message: 'No tracked alerts found for this product.',
      };
    }

    this.saveData(data);
    return {
      success: true,
      message: 'Tracked alerts removed for this product.',
    };
  }

  updateTargetPrice(tcgplayerId, targetPrice) {
    const data = this.getData();

    if (!data.trackedAlerts || data.trackedAlerts.length === 0) {
      return { success: false, message: 'No products to update target price.' };
    }

    let updated = false;
    for (const alert of data.trackedAlerts) {
      if (alert.tcgplayerId === tcgplayerId) {
        alert.targetPrice = targetPrice;
        updated = true;
      }
    }

    if (!updated) {
      return { success: false, message: 'Could not find this product!' };
    }

    this.saveData(data);
    return {
      success: true,
      message: `Target price updated to $${targetPrice} for ${data.priceCache[tcgplayerId].name}`,
    };
  }

  // ===== CHANNEL ALERT =====
  setAlertChannel(channelId, channelName) {
    const data = this.getData();
    if (!data.alertChannels) data.alertChannels = [];
    data.alertChannels.push({
      channelId,
      channelName: channelName,
      isMuted: false,
    });
    this.saveData(data);
  }

  getAlertChannels() {
    const data = this.getData();
    return data.alertChannels || [];
  }

  muteChannel(channelId) {
    const data = this.getData();

    if (!data.alertChannels || !Array.isArray(data.alertChannels)) {
      return { success: false, message: 'No channels available to mute.' };
    }

    const channelObj = data.alertChannels.find(
      (ch) => ch.channelId === channelId
    );

    if (!channelObj) {
      return { success: false, message: 'Channel not found.' };
    }

    if (channelObj.isMuted) {
      return { success: false, message: 'Channel is already muted!' };
    }

    channelObj.isMuted = true;
    this.saveData(data);
    return {
      success: true,
      message: 'Alerts have been muted for this channel!',
    };
  }

  unmuteChannel(channelId) {
    const data = this.getData();

    if (!data.alertChannels || !Array.isArray(data.alertChannels)) {
      return { success: false, message: 'No channels available to unmute.' };
    }

    const channelObj = data.alertChannels.find(
      (ch) => ch.channelId === channelId
    );

    if (!channelObj) {
      return { success: false, message: 'Channel not found.' };
    }

    if (channelObj.isMuted === false) {
      return { success: false, message: 'Channel is already unmuted!' };
    }

    channelObj.isMuted = false;
    this.saveData(data);
    return {
      success: true,
      message: 'Alerts have been unmuted for this channel!',
    };
  }
}

export default new Storage();
