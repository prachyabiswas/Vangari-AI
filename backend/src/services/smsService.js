const db = require('../db');

async function sendCollectorAssignmentSms({
    listingId,
    collectorId,
    phoneNumber,
    ownerAddress,
    route,
    probableWasteAmount,
    classificationLabels,
    expectedAmount,
}) {
    const classes = (classificationLabels || [])
        .slice(0, 3)
        .map((item) => `${item.label} ${(Number(item.score || 0) * 100).toFixed(0)}%`)
        .join(', ');

    const messageText = [
        `Vangari pickup assigned.`,
        ownerAddress ? `Address: ${ownerAddress}.` : '',
        `Route: ${(route.distanceKm || 0).toFixed(2)} km, ETA ${(route.durationMinutes || 0).toFixed(0)} min.`,
        probableWasteAmount ? `Probable waste: ${Number(probableWasteAmount).toFixed(2)} kg.` : '',
        classes ? `Likely classes: ${classes}.` : '',
        `Expected amount: BDT ${Number(expectedAmount || 0).toFixed(2)}.`,
        `Directions: ${route.mapsLink}`,
    ]
        .filter(Boolean)
        .join(' ');

    let status = 'SKIPPED';
    let errorMessage = null;
    let providerMessageId = null;

    try {
        if (phoneNumber) {
            if ((process.env.SMS_PROVIDER || 'MOCK') === 'MOCK') {
                status = 'SENT';
                providerMessageId = `mock-${Date.now()}`;
            } else {
                status = 'SKIPPED';
                errorMessage = 'Only MOCK SMS provider is implemented in this phase.';
            }
        } else {
            errorMessage = 'Collector phone number not available.';
        }

        await db.query(
            `
            INSERT INTO sms_audit (
                listing_id, user_id, phone_number, message_text, provider, status, provider_message_id, error_message
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `,
            [
                listingId,
                collectorId,
                phoneNumber || null,
                messageText,
                process.env.SMS_PROVIDER || 'MOCK',
                status,
                providerMessageId,
                errorMessage,
            ]
        );
    } catch (error) {
        status = 'FAILED';
        errorMessage = error.message;
    }

    return {
        status,
        providerMessageId,
        errorMessage,
        messageText,
    };
}

module.exports = {
    sendCollectorAssignmentSms,
};
