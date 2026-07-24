-- V3__create_work_orders.sql

CREATE TABLE work_orders (
    id           BIGSERIAL    PRIMARY KEY,
    wo_number    VARCHAR(20)  NOT NULL UNIQUE,
    title        VARCHAR(500) NOT NULL,
    description  TEXT,
    priority     VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM'
                              CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    status       VARCHAR(20)  NOT NULL DEFAULT 'NEW'
                              CHECK (status IN ('NEW','ASSIGNED','IN_PROGRESS','ON_HOLD','COMPLETED','CLOSED','CANCELLED')),
    site_id      BIGINT       NOT NULL REFERENCES sites(id),
    customer_id  BIGINT       NOT NULL REFERENCES customers(id),
    assigned_to  BIGINT       REFERENCES users(id),
    created_by   BIGINT       NOT NULL REFERENCES users(id),
    due_date     TIMESTAMPTZ,
    sla_due_date TIMESTAMPTZ,
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    closed_at    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wo_status      ON work_orders(status);
CREATE INDEX idx_wo_assigned    ON work_orders(assigned_to);
CREATE INDEX idx_wo_customer    ON work_orders(customer_id);
CREATE INDEX idx_wo_site        ON work_orders(site_id);
CREATE INDEX idx_wo_due_date    ON work_orders(due_date);
CREATE INDEX idx_wo_created_at  ON work_orders(created_at DESC);
CREATE INDEX idx_wo_tech_status ON work_orders(assigned_to, status);

CREATE TABLE work_order_status_history (
    id            BIGSERIAL   PRIMARY KEY,
    work_order_id BIGINT      NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    old_status    VARCHAR(20),
    new_status    VARCHAR(20) NOT NULL,
    changed_by    BIGINT      NOT NULL REFERENCES users(id),
    change_reason TEXT,
    changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wosh_work_order ON work_order_status_history(work_order_id);
CREATE INDEX idx_wosh_changed_at ON work_order_status_history(changed_at DESC);
