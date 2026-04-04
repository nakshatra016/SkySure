import ridersData from './ridersData.json';

const useBackend = false; // Forced false for Instant Showcase Mode

export const dataService = {
  // 1. Get Dashboard Stats (Mock logic for local data)
  async getDashboardStats() {
    const riders = ridersData;
    const highRisk = riders.filter(r => (parseFloat(r.fraud_probability) || 0) >= 0.5).length;
    const totalPremium = riders.reduce((acc, r) => acc + (parseFloat(r.weekly_premium) || 120), 0);

    return {
      totalRiders: riders.length,
      highRiskRiders: highRisk,
      activeRiders: riders.length,
      avgTrust: (riders.reduce((acc, r) => acc + (parseFloat(r.trust_score) || 0), 0) / riders.length).toFixed(1),
      premiumCollected: totalPremium.toLocaleString(),
      riskTrend: [4, 6, 8, 5, 9, 12, 10] // Sample trend
    };
  },

  // 2. Get All Riders
  async getRiders() {
    return ridersData.map(r => ({
      ...r,
      riderId: r.id || r.rider_id,
      name: r.name || `Partner ${r.rider_id?.split('_').pop() || r.id?.slice(-4)}`
    }));
  },

  // 3. Get Specific Rider
  async getRider(id) {
    const rider = ridersData.find(r => r.id === id || r.rider_id === id);
    if (!rider) return null;
    return {
        ...rider,
        name: rider.name || `Partner ${rider.rider_id?.split('_').pop() || rider.id?.slice(-4)}`
    };
  },

  // 4. Get Premium Logic (Moved from server to local)
  async getPremium(id) {
    const rider = await this.getRider(id);
    if (!rider) return { premium: 150, riskScore: 1.0 };
    
    const earningEfficiency = parseFloat(rider.earning_efficiency) || 0.8;
    const baseWeeklyPremium = parseFloat(rider.weekly_premium) || 120;
    const riskMultiplier = 1 + (1 - earningEfficiency);
    const premium = baseWeeklyPremium * riskMultiplier;

    return {
      premium: parseFloat(premium.toFixed(2)),
      riskScore: parseFloat(riskMultiplier.toFixed(2))
    };
  },

  // 5. Run Full Simulation (Local Simulation Engine)
  async runSimulation(payload) {
    const { rider_id, weather, traffic, orderDrop } = payload;
    const rider = await this.getRider(rider_id);
    if (!rider) throw new Error("Rider mapping failed");

    // 1. Premium Check
    const premiumInfo = await this.getPremium(rider_id);

    // 2. Trigger Check
    let signals = 0;
    if (weather === 'Stormy') signals += 1;
    if (traffic === 'High') signals += 1;
    if (parseFloat(orderDrop) > 0.4) signals += 1;
    const trigger = signals >= 2;

    // 3. Fraud Check
    const fraudScore = (0.5 * parseFloat(rider.fraud_probability)) + 
                       (0.3 * parseFloat(rider.ring_score || 0.2)) + 
                       (0.2 * (1 - parseFloat(rider.earning_efficiency || 0.8)));
    const fraudStatus = fraudScore > 0.7 ? "BLOCK" : "ALLOW";

    // 4. Final Payout
    let payout = 0;
    if (trigger && fraudStatus === "ALLOW") {
      payout = Math.min(parseFloat(rider.predicted_payout || 500), 1500);
    }

    return {
      riderName: rider.name,
      input: { weather, traffic, orderDrop },
      results: {
        premium: premiumInfo.premium,
        trigger,
        fraudStatus,
        payout,
        finalStatus: (trigger && fraudStatus === "ALLOW") ? "APPROVED" : "DENIED"
      }
    };
  },

  // 6. Check Trigger Only
  async checkTrigger(payload) {
    const { weather, traffic, orderDrop } = payload;
    let signals = 0;
    if (weather === 'Stormy') signals += 1;
    if (traffic === 'High') signals += 1;
    if (parseFloat(orderDrop) > 0.4) signals += 1;
    return { trigger: signals >= 2, signals };
  },

  // 7. Get Payout Logs (Generated locally for showcase)
  async getPayouts(riderId = null) {
    let pool = ridersData;
    if (riderId) pool = pool.filter(r => r.id === riderId || r.rider_id === riderId);
    
    return pool.slice(0, 10).map(r => ({
        id: `TRX-SKYSURE-${(r.rider_id || r.id).toUpperCase()}`,
        riderId: r.rider_id || r.id,
        amount: parseFloat(r.predicted_payout) || 450,
        status: Math.random() > 0.4 ? 'Paid' : 'Pending',
        timestamp: new Date().toISOString()
    }));
  }
};
