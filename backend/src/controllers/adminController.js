const db = require('../db');
const { getRouteSummary } = require('../services/routingService');
const { sendCollectorAssignmentSms } = require('../services/smsService');

exports.getUsers = async (req, res) => {
    try {
        const { rows } = await db.query(
            `
            SELECT
                id,
                name,
                email,
                role,
                wallet_balance,
                phone_number,
                sms_opt_in,
                address_text,
                ST_X(location_geom) as lon,
                ST_Y(location_geom) as lat
            FROM users
            `
        );
        return res.json({ success: true, users: rows });
    } catch (error) {
        console.error('getUsers error:', error);
        return res.status(500).json({ error: error.message });
    }
};

exports.getListings = async (req, res) => {
    try {
        const query = `
            SELECT w.*, 
                   u.name as owner_name, u.email as owner_email,
                   c.name as collector_name, c.email as collector_email,
                     c.phone_number as collector_phone_number,
                     COALESCE(w.owner_address_text, u.address_text) as owner_address_text,
                   ST_X(u.location_geom) as owner_lon, ST_Y(u.location_geom) as owner_lat
            FROM waste_listings w
            JOIN users u ON w.owner_id = u.id
            LEFT JOIN users c ON w.collector_id = c.id
            ORDER BY w.created_at DESC
        `;
        const { rows } = await db.query(query);
        return res.json({ success: true, listings: rows });
    } catch (error) {
        console.error('getListings error:', error);
        return res.status(500).json({ error: error.message });
    }
};

exports.getCollectorsForListing = async (req, res) => {
    try {
        const { id } = req.params;

        const listingRes = await db.query('SELECT owner_id FROM waste_listings WHERE id = $1', [id]);
        if (listingRes.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });

        const owner_id = listingRes.rows[0].owner_id;

        const query = `
            SELECT id, name, email, role,
                   ST_Distance(location_geom, (SELECT location_geom FROM users WHERE id = $1)) as distance,
                   ST_X(location_geom) as lon, ST_Y(location_geom) as lat
            FROM users
            WHERE role = 'COLLECTOR' AND location_geom IS NOT NULL
            ORDER BY distance ASC
        `;
        const { rows } = await db.query(query, [owner_id]);

        // Also fetch the owner location to compute the path
        const ownerQuery = `SELECT ST_X(location_geom) as lon, ST_Y(location_geom) as lat FROM users WHERE id = $1`;
        const { rows: ownerRows } = await db.query(ownerQuery, [owner_id]);

        return res.json({
            success: true,
            collectors: rows,
            owner_location: ownerRows[0] || null
        });
    } catch (error) {
        console.error('getCollectorsForListing error:', error);
        return res.status(500).json({ error: error.message });
    }
};

exports.assignCollector = async (req, res) => {
    try {
        const { id } = req.params;
        const { collector_id } = req.body;

        if (!collector_id) {
            return res.status(400).json({ error: 'collector_id is required' });
        }

        const listingQuery = `
            SELECT
                w.id,
                w.owner_id,
                w.status,
                w.probable_waste_amount,
                w.estimated_payout,
                w.classification_labels,
                u.address_text as owner_address_text,
                ST_X(u.location_geom) as owner_lon,
                ST_Y(u.location_geom) as owner_lat
            FROM waste_listings w
            JOIN users u ON u.id = w.owner_id
            WHERE w.id = $1
        `;
        const listingRes = await db.query(listingQuery, [id]);
        if (listingRes.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });

        const listing = listingRes.rows[0];
        if (!listing.owner_lon || !listing.owner_lat) {
            return res.status(400).json({ error: 'Owner location is required to assign route' });
        }

        const collectorRes = await db.query(
            `
            SELECT id, phone_number, sms_opt_in, ST_X(location_geom) as collector_lon, ST_Y(location_geom) as collector_lat
            FROM users
            WHERE id = $1 AND role = 'COLLECTOR'
            `,
            [collector_id]
        );

        if (collectorRes.rows.length === 0) {
            return res.status(404).json({ error: 'Collector not found' });
        }

        const collector = collectorRes.rows[0];
        if (!collector.collector_lon || !collector.collector_lat) {
            return res.status(400).json({ error: 'Collector location is required to generate route' });
        }

        const route = await getRouteSummary(
            { lat: Number(collector.collector_lat), lon: Number(collector.collector_lon) },
            { lat: Number(listing.owner_lat), lon: Number(listing.owner_lon) }
        );

        const updateListingQuery = `
            UPDATE waste_listings 
            SET collector_id = $1, status = 'ASSIGNED', assigned_at = NOW(), owner_address_text = COALESCE(owner_address_text, $3)
            WHERE id = $2
            RETURNING *;
        `;
        const { rows: updated } = await db.query(updateListingQuery, [collector_id, id, listing.owner_address_text || null]);

        if (updated.length === 0) return res.status(404).json({ error: 'Listing not found' });

        try {
            await db.query(
                `
                INSERT INTO collector_route_jobs (
                    listing_id, collector_id, owner_id, provider, route_distance_km, route_duration_minutes, route_geometry, route_summary
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `,
                [
                    id,
                    collector_id,
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
            listingId: id,
            collectorId: collector_id,
            phoneNumber: collector.sms_opt_in ? collector.phone_number : null,
            ownerAddress: listing.owner_address_text,
            route,
            probableWasteAmount: listing.probable_waste_amount,
            classificationLabels: listing.classification_labels || [],
            expectedAmount: listing.estimated_payout,
        });

        try {
            await db.query(
                `
                INSERT INTO listing_status_history (listing_id, previous_status, new_status, changed_by, note)
                VALUES ($1, $2, $3, $4, $5)
                `,
                [id, listing.status, 'ASSIGNED', req.user.userId, 'Admin assigned collector manually']
            );
        } catch (error) {
            console.warn(`listing_status_history insert skipped: ${error.message}`);
        }

        return res.json({
            success: true,
            message: 'Dispatched successfully',
            listing: updated[0],
            route,
            sms,
        });

    } catch (error) {
        console.error('assignCollector error:', error);
        return res.status(500).json({ error: error.message });
    }
};

exports.getCollectorPayouts = async (req, res) => {
    try {
        const summaryQuery = `
            SELECT
                u.id as collector_id,
                u.name as collector_name,
                u.email as collector_email,
                COUNT(w.id) FILTER (WHERE w.collector_id IS NOT NULL) as total_jobs,
                COUNT(w.id) FILTER (WHERE w.payout_status = 'PENDING') as pending_payout_jobs,
                COUNT(w.id) FILTER (WHERE w.payout_status = 'PAID') as paid_jobs,
                COALESCE(SUM(w.collector_payout), 0) as collector_payout_total,
                COALESCE(SUM(w.collector_payout) FILTER (WHERE w.payout_status = 'PENDING'), 0) as collector_payout_pending,
                COALESCE(SUM(w.actual_payout), 0) as owner_actual_payout_total
            FROM users u
            LEFT JOIN waste_listings w ON w.collector_id = u.id
            WHERE u.role = 'COLLECTOR'
            GROUP BY u.id, u.name, u.email
            ORDER BY collector_payout_pending DESC, collector_payout_total DESC
        `;

        const ledgerQuery = `
            SELECT
                l.id,
                l.listing_id,
                l.collector_id,
                u.name as collector_name,
                l.actual_payout,
                l.percent_component,
                l.floor_component,
                l.final_payout,
                l.formula_version,
                l.created_at
            FROM collector_payout_ledger l
            JOIN users u ON u.id = l.collector_id
            ORDER BY l.created_at DESC
            LIMIT 100
        `;

        const [summary, ledger] = await Promise.all([
            db.query(summaryQuery),
            db.query(ledgerQuery),
        ]);

        return res.json({
            success: true,
            summary: summary.rows,
            ledger: ledger.rows,
        });
    } catch (error) {
        console.error('getCollectorPayouts error:', error);
        return res.status(500).json({ error: error.message });
    }
};
