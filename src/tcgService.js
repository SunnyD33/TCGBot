import { JustTCG } from 'justtcg-js';
import storage from './storage.js';
import dotenv from 'dotenv';
dotenv.config();

class TCGService {
  constructor() {
    this.client = new JustTCG();
  }

  async getProductData(tcgplayerId, forceRefresh = false) {
    console.log(`[TCGService] Getting product data for: ${tcgplayerId}`);

    if (!forceRefresh && storage.isCacheFresh(tcgplayerId)) {
      console.log(`[TCGService] Using cached data for: ${tcgplayerId}`);
      return storage.getCachedProduct(tcgplayerId);
    }

    try {
      console.log(`[TCGService] Fetching from API...`);

      const cardResponse = await this.client.v1.cards.get({
        set: 'origins-riftbound-league-of-legends-trading-card-game',
        tcgplayerId: tcgplayerId,
        limit: 1,
      });

      console.log(
        `[TCGService] Card response received:`,
        cardResponse.data?.length || 0,
        'results'
      );

      if (!cardResponse.data || cardResponse.data.length === 0) {
        throw new Error('Product not found');
      }

      const cardData = cardResponse.data[0];
      console.log(`[TCGService] Found card:`, cardData.name);

      // Get price history from variants
      const variant = cardData.variants[0];
      let priceHistory = [];

      if (variant && variant.priceHistory) {
        priceHistory = variant.priceHistory.map((entry) => ({
          date: new Date(entry.t * 1000),
          price: entry.p,
        }));
        console.log(`[TCGService] Price history entries:`, priceHistory.length);
      } else {
        console.log(`[TCGService] No price history available`);
      }

      // Update cache
      const cachedData = storage.updatePriceCache(
        tcgplayerId,
        cardData,
        priceHistory
      );

      console.log(`[TCGService] Cache updated successfully`);
      console.log(
        `[TCGService] API requests remaining: ${cardResponse.usage.apiDailyRequestsRemaining}`
      );

      return cachedData;
    } catch (error) {
      console.error('[TCGService] Error:', error.message);

      // Fallback to stale cache if API fails
      const staleData = storage.getCachedProduct(tcgplayerId);
      if (staleData) {
        console.log('[TCGService] Using stale cache data due to API error');
        return staleData;
      }

      throw error;
    }
  }

  // Quick price check
  async getCurrentPrice(tcgplayerId) {
    const data = await this.getProductData(tcgplayerId);
    return data.currentPrice;
  }

  // Get full price history
  async getPriceHistory(tcgplayerId) {
    const data = await this.getProductData(tcgplayerId);
    return data.priceHistory;
  }
}

export default new TCGService();
