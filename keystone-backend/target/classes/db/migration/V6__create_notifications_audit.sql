-- V6__create_notifications_audit.sql

CREATE TABLE notifications (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_order_id BIGINT       REFERENCES work_orders(id) ON DELETE SET NULL,
    type          VARCHAR(50)  NOT NULL,
    title         VARCHAR(255) NOT NULL,
    message       TEXT         NOT NULL,
    is_read       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

CREATE TABLE audit_logs (
    id           BIGSERIAL    PRIMARY KEY,
    entity_name  VARCHAR(100) NOT NULL,
    entity_id    BIGINT,
    action       VARCHAR(20)  NOT NULL,
    performed_by BIGINT       REFERENCES users(id),
    old_values   JSONB,
    new_values   JSONB,
    ip_address   VARCHAR(45),
    performed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity    ON audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_performed ON audit_logs(performed_at DESC);
CREATE INDEX idx_audit_user      ON audit_logs(performed_by);
CREATE INDEX idx_audit_new_vals  ON audit_logs USING GIN (new_values);
