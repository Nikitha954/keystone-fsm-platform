-- V2__create_customers_sites.sql

CREATE TABLE customers (
    id         BIGSERIAL    PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255),
    phone      VARCHAR(20),
    address    TEXT,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by BIGINT       REFERENCES users(id),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_name   ON customers(name);
CREATE INDEX idx_customers_active ON customers(is_active);

CREATE TABLE sites (
    id          BIGSERIAL       PRIMARY KEY,
    customer_id BIGINT          NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    name        VARCHAR(255)    NOT NULL,
    address     TEXT            NOT NULL,
    city        VARCHAR(100),
    state       VARCHAR(100),
    postal_code VARCHAR(20),
    country     VARCHAR(100)    NOT NULL DEFAULT 'UAE',
    latitude    DECIMAL(10, 8),
    longitude   DECIMAL(11, 8),
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sites_customer ON sites(customer_id);
CREATE INDEX idx_sites_active   ON sites(is_active);
