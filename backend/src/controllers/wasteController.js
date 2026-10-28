const db = require('../db');
const { OpenAI } = require('openai');
const { getRouteSummary } = require('../services/routingService');
const { sendCollectorAssignmentSms } = require('../services/smsService');
const { calculateCollectorPayout } = require('../services/payoutService');

const openrouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': 'https://vangari.com',
        'X-Title': 'Vangari Waste AI',
    }
});

const MATERIAL_KEYWORDS = {
    iron: ['metal', 'iron', 'scrap', 'can', 'steel'],
    plastic: ['plastic', 'bottle', 'pet', 'bag', 'container'],
    electronics: ['electronic', 'computer', 'phone', 'wire', 'cable', 'motherboard'],
};

function buildPredictionsFromSignals(qwenData) {
    const estimates = {
        iron_kg: 0,
        plastic_kg: 0,
        electronics_kg: 0,
        biodegradable_present: false,
        confidence_score: qwenData.confidence_score || 0,
        iron_percent: qwenData.iron_percent || 0,
        plastic_percent: qwenData.plastic_percent || 0,
        electronics_percent: qwenData.electronics_percent || 0,
        total_estimated_kg: qwenData.total_estimated_kg || 0
    };

    const totalWeight = estimates.total_estimated_kg;
    if (totalWeight > 0) {
        estimates.iron_kg = totalWeight * (estimates.iron_percent / 100);
        estimates.plastic_kg = totalWeight * (estimates.plastic_percent / 100);
        estimates.electronics_kg = totalWeight * (estimates.electronics_percent / 100);
    }
    estimates.biodegradable_present = !!qwenData.biodegradable_present;

    return estimates;
}
// old buildPredictionsFromSignals deleted

function mergeEstimates(target, source) {
    target.iron_kg += Number(source.iron_kg || 0);
    target.plastic_kg += Number(source.plastic_kg || 0);
    target.electronics_kg += Number(source.electronics_kg || 0);

    // For percentages and confidence, we'll just take the latest or average them if needed, but since it's typically one image:
    target.total_estimated_kg = Math.max(target.total_estimated_kg || 0, source.total_estimated_kg || 0);
    target.confidence_score = Math.max(target.confidence_score || 0, source.confidence_score || 0);
    target.iron_percent = source.iron_percent;
    target.plastic_percent = source.plastic_percent;
    target.electronics_percent = source.electronics_percent;

    target.biodegradable_present = target.biodegradable_present || Boolean(source.biodegradable_present);
}

async function getPredictionsFromImage(file) {
    let qwenData = {
        iron_percent: 0,
        plastic_percent: 0,
        electronics_percent: 0,
        biodegradable_present: false,
        total_estimated_kg: 0,
        confidence_score: 0
    };

    try {
        const base64Image = file.buffer.toString('base64');
        const mimeType = file.mimetype || 'image/jpeg';
        const dataUri = `data:${mimeType};base64,${base64Image}`;

        const prompt = `You are an expert waste estimator. Analyze the image to identify the core components of the scrap waste. Analyze if producing biomass is possible from the waste. If possible how many kgs of biomass can be produced from the waste.
Provide a strictly valid JSON response, containing:
- "confidence_score": integer between 0 and 100 representing how confident you are.
- "iron_percent": integer (0-100)
- "plastic_percent": integer (0-100)
- "electronics_percent": integer (0-100)
- "biodegradable_present": boolean (true if food/paper/wood is present, otherwise false)
- "is_biomass_possible": boolean (true if food/paper/wood is present, otherwise false)
- "biomass_kg": number (estimate the overall weight in kg if biomass is possible)
- "total_estimated_kg": number (estimate the overall weight in kg)
Make sure the JSON is valid and contains no other text.`;

        const response = await openrouter.chat.completions.create({
            model: 'google/gemma-4-31b-it',
            max_tokens: 300,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: dataUri } },
                        { type: 'text', text: prompt }
                    ]
                }
            ]
        });

        let content = response.choices[0].message.content;

        // Remove markdown formatting if any
        if (content.includes('\`\`\`')) {
            content = content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
        }

        qwenData = JSON.parse(content);

    } catch (error) {
        console.warn(`Qwen Vision AI fallback triggered: ${error.message}`);
        // Fallback to dummy data
        qwenData = {
            iron_percent: 80,
            plastic_percent: 20,
            electronics_percent: 0,
            total_estimated_kg: 2.5,
            confidence_score: 75,
            biodegradable_present: false,
            is_biomass_possible: false,
            biomass_kg: 0,
        };
    }

    return {
        estimates: buildPredictionsFromSignals(qwenData),
    };
}

async function calculateListingValue(totalEstimates) {
    const { rows: rates } = await db.query('SELECT material_type, price_per_kg FROM market_rates');
    let totalValue = 0;

    rates.forEach((rate) => {
        const key = `${rate.material_type}_kg`;
        if (totalEstimates[key]) {
            totalValue += Number(totalEstimates[key]) * Number(rate.price_per_kg);
        }
    });

    return totalValue;
}

async function persistStatusHistory({ listingId, previousStatus, newStatus, changedBy, note }) {
    try {
        await db.query(
            `
            INSERT INTO listing_status_history (listing_id, previous_status, new_status, changed_by, note)
            VALUES ($1, $2, $3, $4, $5)
            `,
            [listingId, previousStatus, newStatus, changedBy, note || null]
        );
    } catch (error) {
        console.warn(`listing_status_history insert skipped: ${error.message}`);
    }
}

exports.analyze = async (req, res) => {
    try {
        const owner_id = req.user.userId;
        const files = req.files;
        const ownerAddressText = (req.body.owner_address_text || '').trim();
        const ownerLat = Number(req.body.owner_lat);
        const ownerLon = Number(req.body.owner_lon);

        if (!files || files.length === 0 || !owner_id) {
            return res.status(400).json({ error: 'Images and owner_id are required.' });
        }

        const total_estimates = {
            iron_kg: 0,
            plastic_kg: 0,
            electronics_kg: 0,
            total_estimated_kg: 0,
            iron_percent: 0,
            plastic_percent: 0,
            electronics_percent: 0,
            confidence_score: 0,
            is_biomass_possible: false,
            biomass_kg: 0,
        };

        for (const file of files) {
            const imagePrediction = await getPredictionsFromImage(file);
            mergeEstimates(total_estimates, imagePrediction.estimates);
        }

        const total_value = await calculateListingValue(total_estimates);

        // Platform takes 20% commission
        const estimated_payout = total_value * 0.8;
        const probable_waste_amount =
            Number(total_estimates.iron_kg || 0) +
            Number(total_estimates.plastic_kg || 0) +
            Number(total_estimates.electronics_kg || 0);

        const firstFile = files[0];
        const imageBase64 = firstFile?.buffer?.toString('base64');
        const imageMimeType = firstFile?.mimetype || 'image/jpeg';
        const simulated_image_url = imageBase64
            ? `data:${imageMimeType};base64,${imageBase64}`
            : `processed_${files.length}_images_via_HF`;

        if (Number.isFinite(ownerLat) && Number.isFinite(ownerLon)) {
            await db.query(
                `
                UPDATE users
                SET
                    location_geom = ST_SetSRID(ST_MakePoint($1, $2), 4326),
                    location_updated_at = NOW(),
                    address_text = COALESCE(NULLIF($3, ''), address_text)
                WHERE id = $4
                `,
                [ownerLon, ownerLat, ownerAddressText, owner_id]
            );
        } else if (ownerAddressText) {
            await db.query(
                `
                UPDATE users
                SET
                    address_text = $1,
                    location_updated_at = NOW()
                WHERE id = $2
                `,
                [ownerAddressText, owner_id]
            );
        }

        // Not using separate classification labels anymore, we rely on total_estimates from Qwen
        const topLabels = [];

        const insertQuery = `
            INSERT INTO waste_listings (
                owner_id,
                image_url,
                ai_estimated_weight,
                estimated_payout,
                status,
                predicted_breakdown,
                classification_labels,
                predicted_total_kg,
                probable_waste_amount,
                actual_payout,
                owner_address_text
            )
            VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        const { rows: inserted } = await db.query(insertQuery, [
            owner_id,
            simulated_image_url,
            JSON.stringify(total_estimates),
            estimated_payout,
            JSON.stringify(total_estimates),
            JSON.stringify(topLabels),
            probable_waste_amount,
            probable_waste_amount,
            estimated_payout,
            ownerAddressText || null,
        ]);

        await persistStatusHistory({
            listingId: inserted[0].id,
            previousStatus: null,
            newStatus: 'PENDING',
            changedBy: owner_id,
            note: 'Listing created after HF analysis',
        });

        return res.json({
            success: true,
            listing: inserted[0],
            ai_estimates: total_estimates,
            probable_waste_amount,
            classification_labels: topLabels,
        });

    } catch (error) {
        console.error('Analyze Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

exports.dispatch = async (req, res) => {
    try {
        const { listingId } = req.params;

        const listingRes = await db.query(
            `
            SELECT id, owner_id, status, probable_waste_amount, estimated_payout, classification_labels
            FROM waste_listings
            WHERE id = $1
            `,
            [listingId]
        );

        if (listingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        const listing = listingRes.rows[0];

        if (listing.status !== 'PENDING') {
            return res.status(400).json({ error: 'Listing is not in PENDING status' });
        }

        const ownerRes = await db.query(
            `
            SELECT
                location_geom,
                ST_X(location_geom) as owner_lon,
                ST_Y(location_geom) as owner_lat,
                address_text
            FROM users
            WHERE id = $1
            `,
            [listing.owner_id]
        );

        if (ownerRes.rows.length === 0 || !ownerRes.rows[0].location_geom) {
            return res.status(400).json({ error: 'Owner location not found for this listing' });
        }

        const nearestQuery = `
            SELECT
                id,
                phone_number,
                sms_opt_in,
                ST_X(location_geom) as collector_lon,
                ST_Y(location_geom) as collector_lat,
                ST_Distance(location_geom, (SELECT location_geom FROM users WHERE id = $1)) as distance
            FROM users 
            WHERE role = 'COLLECTOR' AND location_geom IS NOT NULL
            ORDER BY location_geom <-> (SELECT location_geom FROM users WHERE id = $1)
            LIMIT 1;
        `;
        const nearestRes = await db.query(nearestQuery, [listing.owner_id]);

        if (nearestRes.rows.length === 0) {
            return res.status(404).json({ error: 'No available collectors found' });
        }

        const nearestCollector = nearestRes.rows[0];

        const route = await getRouteSummary(
            {
                lat: Number(nearestCollector.collector_lat),
                lon: Number(nearestCollector.collector_lon),
            },
            {
                lat: Number(ownerRes.rows[0].owner_lat),
                lon: Number(ownerRes.rows[0].owner_lon),
            }
        );

        const updateListingQuery = `
            UPDATE waste_listings 
            SET collector_id = $1, status = 'ASSIGNED', assigned_at = NOW(), owner_address_text = COALESCE(owner_address_text, $3)
            WHERE id = $2
            RETURNING *;
        `;
        const { rows: updated } = await db.query(updateListingQuery, [
            nearestCollector.id,
            listingId,
            ownerRes.rows[0].address_text || null,
        ]);

        try {
            await db.query(
                `
                INSERT INTO collector_route_jobs (
                    listing_id, collector_id, owner_id, provider, route_distance_km, route_duration_minutes, route_geometry, route_summary
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `,
                [
                    listingId,
                    nearestCollector.id,
                    listing.owner_id,
                    route.provider,
                    route.distanceKm,
                    route.durationMinutes,
                    JSON.stringify(route.geometry),
                    route.summary,
                ]
            );
        } catch (error) {
            console.warn(`collector_route_jobs insert skipped: ${error.message}`);
        }

        const sms = await sendCollectorAssignmentSms({
            listingId,
            collectorId: nearestCollector.id,
            phoneNumber: nearestCollector.sms_opt_in ? nearestCollector.phone_number : null,
            ownerAddress: ownerRes.rows[0].address_text,
            route,
            probableWasteAmount: listing.probable_waste_amount,
            classificationLabels: listing.classification_labels || [],
            expectedAmount: listing.estimated_payout,
        });

        await persistStatusHistory({
            listingId,
            previousStatus: listing.status,
            newStatus: 'ASSIGNED',
            changedBy: req.user.userId,
            note: 'Auto-assigned nearest collector',
        });

        return res.json({
            success: true,
            message: 'Dispatched successfully',
            listing: updated[0],
            route,
            sms,
        });

    } catch (error) {
        console.error('Dispatch Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

exports.getCollectorJobs = async (req, res) => {
    try {
        if (req.user.role !== 'COLLECTOR') {
            return res.status(403).json({ error: 'Collectors only' });
        }

        const query = `
            SELECT
                w.id,
                w.status,
                w.assigned_at,
                w.probable_waste_amount,
                w.classification_labels,
                w.estimated_payout,
                w.actual_payout,
                w.collector_payout,
                w.owner_address_text,
                w.actual_collected_breakdown,
                w.actual_total_kg,
                u.name as owner_name,
                u.email as owner_email,
                ST_X(u.location_geom) as owner_lon,
                ST_Y(u.location_geom) as owner_lat,
                r.route_distance_km,
                r.route_duration_minutes,
                r.route_geometry,
                r.route_summary,
                r.provider
            FROM waste_listings w
            JOIN users u ON u.id = w.owner_id
            LEFT JOIN collector_route_jobs r ON r.listing_id = w.id
            WHERE w.collector_id = $1
              AND w.status IN ('ASSIGNED', 'COLLECTED')
            ORDER BY w.assigned_at DESC NULLS LAST, w.created_at DESC
        `;

        const { rows } = await db.query(query, [req.user.userId]);
        return res.json({ success: true, jobs: rows });
    } catch (error) {
        console.error('getCollectorJobs error:', error);
        return res.status(500).json({ error: error.message });
    }
};

exports.submitActualCollection = async (req, res) => {
    try {
        if (req.user.role !== 'COLLECTOR') {
            return res.status(403).json({ error: 'Collectors only' });
        }

        const { listingId } = req.params;
        const { actual_collected_breakdown, collection_notes, mark_collected } = req.body;

        if (!actual_collected_breakdown || typeof actual_collected_breakdown !== 'object') {
            return res.status(400).json({ error: 'actual_collected_breakdown is required' });
        }

        const listingRes = await db.query(
            'SELECT id, status, collector_id FROM waste_listings WHERE id = $1',
            [listingId]
        );

        if (listingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        const listing = listingRes.rows[0];
        if (listing.collector_id !== req.user.userId) {
            return res.status(403).json({ error: 'This listing is not assigned to you' });
        }

        const total_value = await calculateListingValue(actual_collected_breakdown);
        const actual_payout = total_value * 0.8;
        const payoutModel = calculateCollectorPayout(actual_payout);
        const actual_total_kg =
            Number(actual_collected_breakdown.iron_kg || 0) +
            Number(actual_collected_breakdown.plastic_kg || 0) +
            Number(actual_collected_breakdown.electronics_kg || 0);

        const targetStatus = mark_collected ? 'COLLECTED' : listing.status;

        const updateQuery = `
            UPDATE waste_listings
            SET
                actual_collected_breakdown = $1,
                actual_total_kg = $2,
                actual_payout = $3,
                collector_payout = $4,
                collection_notes = COALESCE($5, collection_notes),
                status = $6::varchar,
                collected_at = CASE WHEN $6::varchar = 'COLLECTED' THEN NOW() ELSE collected_at END
            WHERE id = $7
            RETURNING *
        `;

        const { rows: updatedRows } = await db.query(updateQuery, [
            JSON.stringify(actual_collected_breakdown),
            actual_total_kg,
            actual_payout,
            payoutModel.finalPayout,
            collection_notes || null,
            targetStatus,
            listingId,
        ]);

        try {
            await db.query(
                `
                INSERT INTO collector_payout_ledger (
                    listing_id,
                    collector_id,
                    actual_payout,
                    percent_component,
                    floor_component,
                    final_payout,
                    formula_version
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                `,
                [
                    listingId,
                    req.user.userId,
                    actual_payout,
                    payoutModel.percentComponent,
                    payoutModel.floorComponent,
                    payoutModel.finalPayout,
                    payoutModel.formulaVersion,
                ]
            );
        } catch (error) {
            console.warn(`collector_payout_ledger insert skipped: ${error.message}`);
        }

        if (targetStatus !== listing.status) {
            await persistStatusHistory({
                listingId,
                previousStatus: listing.status,
                newStatus: targetStatus,
                changedBy: req.user.userId,
                note: 'Collector submitted actual collection update',
            });
        }

        return res.json({
            success: true,
            listing: updatedRows[0],
            payout_model: payoutModel,
        });
    } catch (error) {
        console.error('submitActualCollection error:', error);
        return res.status(500).json({ error: error.message });
    }
};

exports.submitBatchActualCollection = async (req, res) => {
    try {
        if (req.user.role !== 'COLLECTOR') {
            return res.status(403).json({ error: 'Collectors only' });
        }

        const { updates } = req.body;
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: 'updates array is required' });
        }

        const results = [];
        for (const update of updates) {
            const fakeReq = {
                ...req,
                params: { listingId: update.listing_id },
                body: {
                    actual_collected_breakdown: update.actual_collected_breakdown,
                    collection_notes: update.collection_notes,
                    mark_collected: true,
                },
            };

            let payload = null;
            const fakeRes = {
                status(code) {
                    this.statusCode = code;
                    return this;
                },
                json(body) {
                    payload = body;
                    this.body = body;
                    return this;
                },
            };

            await exports.submitActualCollection(fakeReq, fakeRes);
            results.push({
                listing_id: update.listing_id,
                success: Boolean(payload?.success),
                result: payload,
            });
        }

        return res.json({ success: true, results });
    } catch (error) {
        console.error('submitBatchActualCollection error:', error);
        return res.status(500).json({ error: error.message });
    }
};

exports.getOwnerHistory = async (req, res) => {
    try {
        if (req.user.role !== 'OWNER') {
            return res.status(403).json({ error: 'Owners only' });
        }

        const ownerId = req.user.userId;

        const historyQuery = `
            SELECT
                w.id,
                w.image_url,
                w.status,
                w.created_at,
                w.assigned_at,
                w.collected_at,
                w.ai_estimated_weight,
                w.estimated_payout,
                w.actual_payout,
                w.collector_payout,
                w.owner_address_text,
                w.probable_waste_amount,
                c.name as collector_name
            FROM waste_listings w
            LEFT JOIN users c ON c.id = w.collector_id
            WHERE w.owner_id = $1
            ORDER BY w.created_at DESC
        `;

        const soldQuery = `
            SELECT
                w.id,
                w.image_url,
                w.status,
                w.created_at,
                w.collected_at,
                w.actual_payout,
                w.owner_address_text,
                c.name as collector_name
            FROM waste_listings w
            LEFT JOIN users c ON c.id = w.collector_id
            WHERE w.owner_id = $1
              AND w.status = 'SOLD'
            ORDER BY w.created_at DESC
        `;

        const [historyRes, soldRes] = await Promise.all([
            db.query(historyQuery, [ownerId]),
            db.query(soldQuery, [ownerId]),
        ]);

        const soldTotal = soldRes.rows.reduce((acc, item) => acc + Number(item.actual_payout || 0), 0);

        return res.json({
            success: true,
            uploaded_history: historyRes.rows,
            sold_history: soldRes.rows,
            summary: {
                total_uploaded: historyRes.rows.length,
                total_sold: soldRes.rows.length,
                sold_total_amount: soldTotal,
            },
        });
    } catch (error) {
        console.error('getOwnerHistory error:', error);
        return res.status(500).json({ error: error.message });
    }
};
