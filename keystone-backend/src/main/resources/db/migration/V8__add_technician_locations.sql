-- Create table to store technician GPS locations
CREATE TABLE technician_locations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  recorded_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_technician_locations_user_recorded_at ON technician_locations(user_id, recorded_at DESC);
