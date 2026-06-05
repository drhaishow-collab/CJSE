-- Schema definition for CJ MarketBoard
-- Drop tables if exist (for dev initialization)
DROP TABLE IF EXISTS competitor_intel CASCADE;
DROP TABLE IF EXISTS visit_details CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (Supervisors and Market Staff)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(20) DEFAULT 'rep', -- 'sup' (supervisor), 'rep' (field representative)
    phone VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stores table (MT / GT outlets)
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    channel VARCHAR(10) DEFAULT 'MT', -- 'MT' (Modern Trade/Supermarkets), 'GT' (General Trade/Traditional markets)
    region VARCHAR(50) DEFAULT 'HCM',
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products table (CJ Bibigo vs. Competitor brands)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(50) DEFAULT 'CJ Bibigo', -- 'CJ Bibigo', 'Chinsu', 'Vissan', etc.
    category VARCHAR(50) NOT NULL, -- 'Mandu', 'Kimchi', 'Sauce', etc.
    price NUMERIC(12, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Visits table (Log of store audits)
CREATE TABLE visits (
    id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    visit_date DATE DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP WITH TIME ZONE,
    compliance_rate NUMERIC(5, 2) DEFAULT 0.00, -- POSM display compliance (0-100%)
    notes TEXT,
    shelf_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Visit Details (Shelf share and pricing for products)
CREATE TABLE visit_details (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    is_oos BOOLEAN DEFAULT FALSE, -- Out Of Stock status
    share_of_shelf NUMERIC(5, 2) DEFAULT 0.00, -- Percentage of shelf occupied by product (0-100%)
    actual_price NUMERIC(12, 2) NOT NULL
);

-- Competitor Intelligence (Captured promo activities or pricing)
CREATE TABLE competitor_intel (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    competitor_brand VARCHAR(50) NOT NULL,
    intel_type VARCHAR(50) NOT NULL, -- 'Promo', 'Pricing', 'Display', 'New Product'
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
