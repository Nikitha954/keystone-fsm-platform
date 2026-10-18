-- Enable PostGIS for spatial queries if available on the PostgreSQL host instance
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS postgis;

    -- Add geometry column to technician_locations for spatial indexing
    ALTER TABLE technician_locations
        ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

    -- Populate geom from existing lat/lng rows
    UPDATE technician_locations
    SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE geom IS NULL;

    -- Spatial index for fast nearest-neighbour queries
    CREATE INDEX IF NOT EXISTS idx_tech_locations_geom
        ON technician_locations USING GIST (geom);

    -- Trigger to keep geom in sync with lat/lng on insert/update
    EXECUTE '
    CREATE OR REPLACE FUNCTION sync_tech_location_geom()
    RETURNS TRIGGER AS $trig$
    BEGIN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
        RETURN NEW;
    END;
    $trig$ LANGUAGE plpgsql;
    ';

    DROP TRIGGER IF EXISTS trg_sync_tech_location_geom ON technician_locations;
    CREATE TRIGGER trg_sync_tech_location_geom
        BEFORE INSERT OR UPDATE OF latitude, longitude ON technician_locations
        FOR EACH ROW EXECUTE FUNCTION sync_tech_location_geom();
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'PostGIS extension not installed on local PostgreSQL. Skipping spatial geometry creation.';
END $$;

-- Predictive inventory: store forecast result per part
ALTER TABLE parts
    ADD COLUMN IF NOT EXISTS predicted_depletion_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS avg_daily_usage          NUMERIC(10, 4);
