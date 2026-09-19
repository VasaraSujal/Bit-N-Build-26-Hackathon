-- Seed: 001_demo_data.sql
-- Description: Seed initial demo clubs and events for testing
-- Note: User accounts with password hashes will be seeded during the authentication phase.

-- Insert Demo Clubs
INSERT INTO clubs (id, name, description, logo_url, is_active)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Developer Student Club', 'A community of passionate student developers building technology solutions.', 'https://example.com/dsc-logo.png', TRUE),
    ('c2222222-2222-2222-2222-222222222222', 'Robotics & Automation Society', 'Dedicated to robotics, hardware tinkering, and automated systems engineering.', 'https://example.com/robotics-logo.png', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert Demo Events
INSERT INTO events (id, club_id, name, description, event_date)
VALUES
    ('e1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Bit N Build 2026 Hackathon', 'Annual 36-hour flagship national hackathon.', CURRENT_TIMESTAMP + INTERVAL '14 days'),
    ('e2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'Cloud & AI Workshop', 'Hands-on bootcamp on modern cloud native architectures.', CURRENT_TIMESTAMP + INTERVAL '30 days'),
    ('e3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222', 'RoboWars Grand Prix', 'Annual inter-college combat robotics competition.', CURRENT_TIMESTAMP + INTERVAL '45 days')
ON CONFLICT (id) DO NOTHING;
