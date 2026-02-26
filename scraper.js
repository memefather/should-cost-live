const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scraper for live commodity prices from public finance sites.
 * This avoids expensive API keys while keeping data "Real".
 */
async function getLiveMaterialPrices() {
    const materials = {
        'Aluminum': 'https://markets.businessinsider.com/commodities/aluminum-price',
        'Copper': 'https://markets.businessinsider.com/commodities/copper-price',
        'Steel': 'https://markets.businessinsider.com/commodities/steel-price',
        'Nickel': 'https://markets.businessinsider.com/commodities/nickel-price'
    };

    const results = {};

    for (const [name, url] of Object.entries(materials)) {
        try {
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const $ = cheerio.load(data);
            // Business Insider specific selector for the price
            const priceText = $('.price-section__current-value').first().text().trim().replace(/,/g, '');
            results[name] = parseFloat(priceText);
        } catch (error) {
            console.error(`Error scraping ${name}:`, error.message);
            results[name] = null; // Fallback to database defaults
        }
    }
    return results;
}

module.exports = { getLiveMaterialPrices };
