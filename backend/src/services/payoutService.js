const COLLECTOR_PERCENT = Number(process.env.COLLECTOR_PAYOUT_PERCENT || 0.12);
const COLLECTOR_PAYOUT_FLOOR = Number(process.env.COLLECTOR_PAYOUT_FLOOR || 30);

function calculateCollectorPayout(actualPayout) {
    const safeActualPayout = Number(actualPayout || 0);
    const percentComponent = safeActualPayout * COLLECTOR_PERCENT;
    const floorComponent = COLLECTOR_PAYOUT_FLOOR;
    const finalPayout = Math.max(percentComponent, floorComponent);

    return {
        percentComponent,
        floorComponent,
        finalPayout,
        formulaVersion: 'PERCENT_PLUS_FLOOR_V1',
    };
}

module.exports = {
    calculateCollectorPayout,
};
