-- Hashed 'password123' generated with bcrypt 10 rounds
DO $$
DECLARE
    dummy_hash VARCHAR := '$2a$10$/D1RYBd/.CpQEqSHPaIdoe8H0YKIrxi4hqCMqD6E8rt24zU9N.bi6';
BEGIN
    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) 
    VALUES ('Test Owner', 'owner@example.com', dummy_hash, 'OWNER', ST_SetSRID(ST_MakePoint(90.4125, 23.8103), 4326), '+8801700000001', 'Road 12, Dhanmondi, Dhaka')
    ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        phone_number = EXCLUDED.phone_number,
        address_text = EXCLUDED.address_text;

    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) 
    VALUES ('Test Collector', 'collector@example.com', dummy_hash, 'COLLECTOR', ST_SetSRID(ST_MakePoint(90.4130, 23.8110), 4326), '+8801700000100', 'Collector Hub, Panthapath, Dhaka')
    ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        phone_number = EXCLUDED.phone_number,
        address_text = EXCLUDED.address_text;

    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) 
    VALUES ('Admin Supreme', 'admin@example.com', dummy_hash, 'ADMIN', ST_SetSRID(ST_MakePoint(90.4100, 23.8100), 4326), '+8801700000999', 'Admin Office, Green Road, Dhaka')
    ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        phone_number = EXCLUDED.phone_number,
        address_text = EXCLUDED.address_text;

    -- 10 Dummy Collectors spread around Dhaka
    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) VALUES ('C1', 'c1@example.com', dummy_hash, 'COLLECTOR', ST_SetSRID(ST_MakePoint(90.4150, 23.8120), 4326), '+8801700000101', 'Panthapath Node 1, Dhaka') ON CONFLICT (email) DO NOTHING;
    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) VALUES ('C2', 'c2@example.com', dummy_hash, 'COLLECTOR', ST_SetSRID(ST_MakePoint(90.4110, 23.8160), 4326), '+8801700000102', 'Panthapath Node 2, Dhaka') ON CONFLICT (email) DO NOTHING;
    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) VALUES ('C3', 'c3@example.com', dummy_hash, 'COLLECTOR', ST_SetSRID(ST_MakePoint(90.4200, 23.8100), 4326), '+8801700000103', 'Panthapath Node 3, Dhaka') ON CONFLICT (email) DO NOTHING;
    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) VALUES ('C4', 'c4@example.com', dummy_hash, 'COLLECTOR', ST_SetSRID(ST_MakePoint(90.4180, 23.8150), 4326), '+8801700000104', 'Panthapath Node 4, Dhaka') ON CONFLICT (email) DO NOTHING;
    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) VALUES ('C5', 'c5@example.com', dummy_hash, 'COLLECTOR', ST_SetSRID(ST_MakePoint(90.4090, 23.8110), 4326), '+8801700000105', 'Panthapath Node 5, Dhaka') ON CONFLICT (email) DO NOTHING;
    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) VALUES ('C6', 'c6@example.com', dummy_hash, 'COLLECTOR', ST_SetSRID(ST_MakePoint(90.4140, 23.8080), 4326), '+8801700000106', 'Panthapath Node 6, Dhaka') ON CONFLICT (email) DO NOTHING;
    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) VALUES ('C7', 'c7@example.com', dummy_hash, 'COLLECTOR', ST_SetSRID(ST_MakePoint(90.4130, 23.8050), 4326), '+8801700000107', 'Panthapath Node 7, Dhaka') ON CONFLICT (email) DO NOTHING;
    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) VALUES ('C8', 'c8@example.com', dummy_hash, 'COLLECTOR', ST_SetSRID(ST_MakePoint(90.4160, 23.8130), 4326), '+8801700000108', 'Panthapath Node 8, Dhaka') ON CONFLICT (email) DO NOTHING;
    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) VALUES ('C9', 'c9@example.com', dummy_hash, 'COLLECTOR', ST_SetSRID(ST_MakePoint(90.4100, 23.8140), 4326), '+8801700000109', 'Panthapath Node 9, Dhaka') ON CONFLICT (email) DO NOTHING;
    INSERT INTO users (name, email, password_hash, role, location_geom, phone_number, address_text) VALUES ('C10', 'c10@example.com', dummy_hash, 'COLLECTOR', ST_SetSRID(ST_MakePoint(90.4120, 23.8170), 4326), '+8801700000110', 'Panthapath Node 10, Dhaka') ON CONFLICT (email) DO NOTHING;

    INSERT INTO market_rates (material_type, price_per_kg)
    VALUES 
        ('iron', 62.00),
        ('plastic', 12.00),
        ('electronics', 180.00)
    ON CONFLICT (material_type) DO UPDATE SET price_per_kg = EXCLUDED.price_per_kg;
END $$;