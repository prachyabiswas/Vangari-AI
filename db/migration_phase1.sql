ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30),
ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS address_text TEXT,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE waste_listings
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS predicted_breakdown JSONB,
ADD COLUMN IF NOT EXISTS classification_labels JSONB,
ADD COLUMN IF NOT EXISTS predicted_total_kg DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS actual_collected_breakdown JSONB,
ADD COLUMN IF NOT EXISTS actual_total_kg DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS actual_payout DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS collector_payout DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS payout_status VARCHAR(30) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS owner_address_text TEXT,
ADD COLUMN IF NOT EXISTS collection_notes TEXT,
ADD COLUMN IF NOT EXISTS probable_waste_amount DECIMAL(10, 2);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'waste_listings_payout_status_check'
    ) THEN
        ALTER TABLE waste_listings
        ADD CONSTRAINT waste_listings_payout_status_check
        CHECK (payout_status IN ('PENDING', 'SCHEDULED', 'PAID', 'DISPUTED'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS collector_route_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES waste_listings(id) ON DELETE CASCADE,
    collector_id UUID REFERENCES users(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'OSRM',
    route_distance_km DECIMAL(10, 2),
    route_duration_minutes DECIMAL(10, 2),
    route_geometry JSONB,
    route_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES waste_listings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(30),
    message_text TEXT NOT NULL,
    provider VARCHAR(50) DEFAULT 'MOCK',
    status VARCHAR(30) DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED', 'SKIPPED')),
    provider_message_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collector_payout_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES waste_listings(id) ON DELETE CASCADE,
    collector_id UUID REFERENCES users(id) ON DELETE CASCADE,
    actual_payout DECIMAL(10, 2) NOT NULL,
    percent_component DECIMAL(10, 2) NOT NULL,
    floor_component DECIMAL(10, 2) NOT NULL,
    final_payout DECIMAL(10, 2) NOT NULL,
    formula_version VARCHAR(40) DEFAULT 'PERCENT_PLUS_FLOOR_V1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listing_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES waste_listings(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

UPDATE waste_listings
SET predicted_breakdown = COALESCE(predicted_breakdown, ai_estimated_weight),
    probable_waste_amount = COALESCE(probable_waste_amount,
        COALESCE((ai_estimated_weight->>'iron_kg')::numeric, 0) +
        COALESCE((ai_estimated_weight->>'plastic_kg')::numeric, 0) +
        COALESCE((ai_estimated_weight->>'electronics_kg')::numeric, 0)
    ),
    actual_payout = COALESCE(actual_payout, estimated_payout)
WHERE predicted_breakdown IS NULL OR probable_waste_amount IS NULL OR actual_payout IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_location_geom ON users USING GIST (location_geom);
CREATE INDEX IF NOT EXISTS idx_waste_listings_status ON waste_listings(status);
CREATE INDEX IF NOT EXISTS idx_waste_listings_collector_status ON waste_listings(collector_id, status);
CREATE INDEX IF NOT EXISTS idx_route_jobs_listing_id ON collector_route_jobs(listing_id);
CREATE INDEX IF NOT EXISTS idx_sms_audit_listing_id ON sms_audit(listing_id);
CREATE INDEX IF NOT EXISTS idx_payout_ledger_collector_created_at ON collector_payout_ledger(collector_id, created_at DESC);
