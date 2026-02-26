const fs = require('fs');
const path = require('path');
const { getLiveMaterialPrices } = require('./scraper');

/**
 * Engineering Should-Cost Engine (Pro)
 * Handles multi-material BOMs, process stacking, and margin analysis.
 */
class ShouldCostEngine {
    constructor() {
        this.benchmarks = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/benchmarks.json'), 'utf8'));
    }

    async calculate(payload) {
        const { 
            items = [], // Array of { materialId, weight, qty }
            processes = [], // Array of { processId, hours, qty }
            labor = [], // Array of { region, title, hours }
            supplierQuote = 0,
            logisticsFactor = 1.05 // Default 5% for freight/duty
        } = payload;

        // 1. Get Live Material Pricing
        const livePrices = await getLiveMaterialPrices();
        
        // 2. Calculate Material Subtotal
        let materialSubtotal = 0;
        const materialBreakdown = items.map(item => {
            const spec = this.benchmarks.materials.find(m => m.id === item.materialId);
            const marketPrice = livePrices[spec.name.split(' ')[0]] || 5.00; // Fallback to $5/kg if scraping fails
            const cost = item.weight * item.qty * marketPrice;
            materialSubtotal += cost;
            return { name: spec.name, cost };
        });

        // 3. Calculate Process & Labor Subtotal
        let laborSubtotal = 0;
        const laborBreakdown = labor.map(l => {
            const rateSpec = this.benchmarks.labor_rates.find(r => r.region === l.region && r.title === l.title);
            const cost = rateSpec.rate * l.hours;
            laborSubtotal += cost;
            return { region: l.region, title: l.title, cost };
        });

        let processSubtotal = 0;
        const processBreakdown = processes.map(p => {
            const spec = this.benchmarks.processes.find(pr => pr.id === p.id);
            const cost = (p.hours || 0) * (p.qty || 1) * 50; // Base shop rate $50/hr * overhead factor
            processSubtotal += cost * spec.overhead_factor;
            return { name: spec.name, cost: cost * spec.overhead_factor };
        });

        // 4. Final Aggregation
        const netShouldCost = (materialSubtotal + laborSubtotal + processSubtotal) * logisticsFactor;
        
        // 5. Margin & Negotiation Analysis ("The Margin Sniffer")
        let marginAnalysis = null;
        if (supplierQuote > 0) {
            const rawMargin = (supplierQuote - netShouldCost) / supplierQuote;
            const marginPct = (rawMargin * 100).toFixed(1);
            
            let recommendation = "";
            let status = "";
            
            if (marginPct > 35) {
                status = "CRITICAL: OVERCHARGE";
                recommendation = "Margin exceeds 35%. Immediate re-quote required. Check for 'Hidden' setup fees or excessive scrap assumptions.";
            } else if (marginPct > 20) {
                status = "NEGOTIABLE";
                recommendation = "Target a 12-15% margin for high-volume production. Push for tiered pricing based on LME index.";
            } else if (marginPct > 0) {
                status = "HEALTHY";
                recommendation = "Fair market pricing. Focus on lead-time optimization and quality assurance.";
            } else {
                status = "UNSUSTAINABLE / LOSS";
                recommendation = "Supplier may be underquoting to win business. Risk of future 'Force Majeure' price hikes or quality cuts.";
            }

            marginAnalysis = {
                quoted: supplierQuote,
                shouldCost: netShouldCost,
                marginPct: marginPct + "%",
                status,
                recommendation
            };
        }

        return {
            totalShouldCost: netShouldCost,
            breakdown: {
                materials: materialBreakdown,
                labor: laborBreakdown,
                processes: processBreakdown
            },
            marginAnalysis
        };
    }
}

module.exports = ShouldCostEngine;
