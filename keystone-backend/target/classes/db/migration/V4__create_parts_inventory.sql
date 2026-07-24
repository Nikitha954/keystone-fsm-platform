-- V4__create_parts_inventory.sql

CREATE TABLE parts (
    id          BIGSERIAL       PRIMARY KEY,
    part_number VARCHAR(50)     NOT NULL UNIQUE,
    name        VARCHAR(255)    NOT NULL,
    description TEXT,
    unit_cost   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    stock_qty   INTEGER         NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    min_stock   INTEGER         NOT NULL DEFAULT 5,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parts_number ON parts(part_number);
CREATE INDEX idx_parts_active ON parts(is_active);

CREATE TABLE part_usage (
    id               BIGSERIAL     PRIMARY KEY,
    work_order_id    BIGINT        NOT NULL REFERENCES work_orders(id),
    part_id          BIGINT        NOT NULL REFERENCES parts(id),
    quantity         INTEGER       NOT NULL CHECK (quantity > 0),
    unit_cost_at_use DECIMAL(10,2) NOT NULL,
    used_by          BIGINT        NOT NULL REFERENCES users(id),
    notes            TEXT,
    used_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_part_usage_wo   ON part_usage(work_order_id);
CREATE INDEX idx_part_usage_part ON part_usage(part_id);
