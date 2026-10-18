-- Update all demo users to have a valid BCrypt hash for password 'Admin@123'
UPDATE users
SET password = '$2a$12$.V9/OI5sxXjCqqcq7bnrIO10xPaSw/X0Q2TYrVY70jXNBw/1sdw16'
WHERE email IN (
    'admin@keystone.com',
    'dispatcher@keystone.com',
    'tech@keystone.com',
    'customer@keystone.com'
);
