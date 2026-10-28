CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('OWNER', 'COLLECTOR', 'ADMIN')),
    location_geom GEOMETRY(Point, 4326),
    wallet_balance DECIMAL(10, 2) DEFAULT 0,
    phone_number VARCHAR(30),
    sms_opt_in BOOLEAN DEFAULT true,
    address_text TEXT,
    location_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_rates (
    material_type VARCHAR(100) PRIMARY KEY,
    price_per_kg DECIMAL(10, 2) NOT NULL,
    is_biodegradable BOOLEAN DEFAULT false,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS waste_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id),
    collector_id UUID REFERENCES users(id),
    image_url TEXT NOT NULL,
    ai_estimated_weight JSONB,
    verified_weight JSONB,
    estimated_payout DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'COLLECTED', 'WAREHOUSED', 'SOLD')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    collected_at TIMESTAMP,
    predicted_breakdown JSONB,
    classification_labels JSONB,
    predicted_total_kg DECIMAL(10, 2),
    actual_collected_breakdown JSONB,
    actual_total_kg DECIMAL(10, 2),
    actual_payout DECIMAL(10, 2),
    collector_payout DECIMAL(10, 2),
    payout_status VARCHAR(30) DEFAULT 'PENDING' CHECK (payout_status IN ('PENDING', 'SCHEDULED', 'PAID', 'DISPUTED')),
    owner_address_text TEXT,
    collection_notes TEXT,
    probable_waste_amount DECIMAL(10, 2)
);

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

CREATE INDEX IF NOT EXISTS idx_users_location_geom ON users USING GIST (location_geom);
CREATE INDEX IF NOT EXISTS idx_waste_listings_status ON waste_listings(status);
CREATE INDEX IF NOT EXISTS idx_waste_listings_collector_status ON waste_listings(collector_id, status);
CREATE INDEX IF NOT EXISTS idx_route_jobs_listing_id ON collector_route_jobs(listing_id);
CREATE INDEX IF NOT EXISTS idx_sms_audit_listing_id ON sms_audit(listing_id);
CREATE INDEX IF NOT EXISTS idx_payout_ledger_collector_created_at ON collector_payout_ledger(collector_id, created_at DESC);
