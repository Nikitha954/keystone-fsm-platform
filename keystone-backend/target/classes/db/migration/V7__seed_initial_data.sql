-- V7__seed_initial_data.sql

INSERT INTO roles (name, description) VALUES
    ('ROLE_MANAGER',    'Full system access'),
    ('ROLE_DISPATCHER', 'Create and assign work orders'),
    ('ROLE_TECHNICIAN', 'Execute assigned work orders'),
    ('ROLE_CUSTOMER',   'Submit and track maintenance requests');

-- Default admin: admin@keystone.com / Admin@123
INSERT INTO users (username, email, password, first_name, last_name, is_active)
VALUES ('admin', 'admin@keystone.com',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFgSRCpg6z8pCiG',
        'System', 'Administrator', TRUE);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ROLE_MANAGER';

-- Demo dispatcher: dispatcher@keystone.com / Admin@123
INSERT INTO users (username, email, password, first_name, last_name, is_active)
VALUES ('dispatcher1', 'dispatcher@keystone.com',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFgSRCpg6z8pCiG',
        'Sarah', 'Mitchell', TRUE);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'dispatcher1' AND r.name = 'ROLE_DISPATCHER';

-- Demo technician: tech@keystone.com / Admin@123
INSERT INTO users (username, email, password, first_name, last_name, is_active)
VALUES ('tech1', 'tech@keystone.com',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFgSRCpg6z8pCiG',
        'James', 'Walker', TRUE);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'tech1' AND r.name = 'ROLE_TECHNICIAN';

-- Demo customer: customer@keystone.com / Admin@123
INSERT INTO users (username, email, password, first_name, last_name, is_active)
VALUES ('customer1', 'customer@keystone.com',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFgSRCpg6z8pCiG',
        'Acme', 'Corp', TRUE);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'customer1' AND r.name = 'ROLE_CUSTOMER';

-- Demo customer record
INSERT INTO customers (name, email, phone, address, is_active)
VALUES ('Acme Corporation', 'customer@keystone.com', '+971-50-000-0001', 'Dubai, UAE', TRUE);

-- Demo site
INSERT INTO sites (customer_id, name, address, city, country, latitude, longitude, is_active)
SELECT id, 'Acme HQ', 'Sheikh Zayed Road, Dubai', 'Dubai', 'UAE', 25.2048, 55.2708, TRUE
FROM customers WHERE name = 'Acme Corporation';

-- Demo parts
INSERT INTO parts (part_number, name, description, unit_cost, stock_qty, min_stock) VALUES
    ('PART-001', 'Air Filter',        'HVAC air filter 24x24',      12.50,  50, 10),
    ('PART-002', 'Bearing 6205',      'Deep groove ball bearing',    8.75,  30,  5),
    ('PART-003', 'Belt V-Type A42',   'V-belt for compressor',       6.00,  20,  5),
    ('PART-004', 'Capacitor 45uf',    'Run capacitor for AC motor', 15.00,  25,  5),
    ('PART-005', 'Contactor 25A',     '3-phase contactor',          22.00,  15,  3);
