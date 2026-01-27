-- -- Create enum type for timer_type
-- CREATE TYPE timer_type AS ENUM ('setup', 'turn', 'action');

-- -- Create game_timers table
-- CREATE TABLE game_timers (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     game_id UUID NOT NULL,
--     timer_type timer_type NOT NULL DEFAULT 'setup',
--     duration_seconds INTEGER NOT NULL,
--     remaining_seconds INTEGER NOT NULL,
--     start_time BIGINT NOT NULL,
--     is_expired BOOLEAN NOT NULL DEFAULT FALSE,
--     is_paused BOOLEAN NOT NULL DEFAULT FALSE,
--     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
--     -- Foreign key constraint
--     CONSTRAINT fk_game
--         FOREIGN KEY (game_id)
--         REFERENCES games(id)
--         ON DELETE CASCADE,
        
--     -- Unique constraint to ensure only one timer of each type per game
--     CONSTRAINT unique_game_timer_type
--         UNIQUE (game_id, timer_type)
-- );

-- -- Create index for faster lookups
-- CREATE INDEX idx_game_timers_game_id ON game_timers(game_id);
-- CREATE INDEX idx_game_timers_type ON game_timers(timer_type);

-- -- Create trigger to automatically update the updated_at timestamp
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = NOW();
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER update_game_timers_updated_at
-- BEFORE UPDATE ON game_timers
-- FOR EACH ROW
-- EXECUTE FUNCTION update_updated_at_column();


-- Drop the existing table if it exists
DROP TABLE IF EXISTS game_timers CASCADE;

-- Create game_timers table with the exact column names TypeORM expects
CREATE TABLE game_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL,
    timer_type VARCHAR(50) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    remaining_seconds INTEGER NOT NULL,
    start_time BIGINT NOT NULL,
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_game
        FOREIGN KEY (game_id)
        REFERENCES games(id)
        ON DELETE CASCADE,
        
    -- Unique constraint to ensure only one timer of each type per game
    CONSTRAINT unique_game_timer_type
        UNIQUE (game_id, timer_type)
);

-- Create index for faster lookups
CREATE INDEX idx_game_timers_game_id ON game_timers(game_id);
CREATE INDEX idx_game_timers_type ON game_timers(timer_type);

-- Create trigger to automatically update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_game_timers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_timers_timestamp
BEFORE UPDATE ON game_timers
FOR EACH ROW
EXECUTE FUNCTION update_game_timers_timestamp();