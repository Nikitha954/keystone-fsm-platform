-- V5__create_time_logs_attachments.sql

CREATE TABLE time_logs (
    id               BIGSERIAL   PRIMARY KEY,
    work_order_id    BIGINT      NOT NULL REFERENCES work_orders(id),
    technician_id    BIGINT      NOT NULL REFERENCES users(id),
    start_time       TIMESTAMPTZ NOT NULL,
    end_time         TIMESTAMPTZ,
    duration_minutes INTEGER,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_logs_wo   ON time_logs(work_order_id);
CREATE INDEX idx_time_logs_tech ON time_logs(technician_id);

CREATE TABLE attachments (
    id            BIGSERIAL    PRIMARY KEY,
    work_order_id BIGINT       NOT NULL REFERENCES work_orders(id),
    file_name     VARCHAR(255) NOT NULL,
    file_url      TEXT         NOT NULL,
    file_type     VARCHAR(50),
    file_size_kb  INTEGER,
    uploaded_by   BIGINT       NOT NULL REFERENCES users(id),
    uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_wo ON attachments(work_order_id);
