-- PostgreSQL schema for pet health platform
-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Enums (idempotent via DO blocks)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
  CREATE TYPE user_role AS ENUM ('user','admin','moderator');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pet_type') THEN
  CREATE TYPE pet_type AS ENUM ('dog','cat','other');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender') THEN
  CREATE TYPE gender AS ENUM ('male','female');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poop_shape') THEN
  CREATE TYPE poop_shape AS ENUM ('type1','type2','type3','type4','type5','type6','type7');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'health_status') THEN
  CREATE TYPE health_status AS ENUM ('healthy','warning','concerning');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_status') THEN
  CREATE TYPE post_status AS ENUM ('published','draft','archived');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_category') THEN
  CREATE TYPE post_category AS ENUM ('health','help','experience','general');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_status') THEN
  CREATE TYPE moderation_status AS ENUM ('approved','pending','rejected');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_reason') THEN
  CREATE TYPE report_reason AS ENUM ('spam','inappropriate','harassment','violence','hate_speech','misinformation','other');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_action') THEN
  CREATE TYPE moderation_action AS ENUM ('none','warning','content_removed','user_suspended','user_banned');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_rule_type') THEN
  CREATE TYPE moderation_rule_type AS ENUM ('keyword','pattern','length','frequency','custom');
END IF; END $$;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  phone text,
  location text,
  bio text
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notifications boolean NOT NULL DEFAULT true,
  email_updates boolean NOT NULL DEFAULT true,
  language text NOT NULL DEFAULT 'zh-CN'
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_analysis integer NOT NULL DEFAULT 0,
  total_posts integer NOT NULL DEFAULT 0,
  reputation integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, refresh_token_hash)
);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_expires_at ON user_tokens(expires_at);

-- Add external_id and last_login_at to users (idempotent)
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS external_id text UNIQUE;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Pets
CREATE TABLE IF NOT EXISTS pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type pet_type NOT NULL,
  breed text,
  gender gender,
  age integer,
  weight numeric(6,2),
  avatar_url text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id);
ALTER TABLE IF EXISTS pets ADD COLUMN IF NOT EXISTS external_id text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_pets_external_id ON pets(external_id);

-- Poop Records
CREATE TABLE IF NOT EXISTS poop_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  thumbnail_url text,
  shape poop_shape NOT NULL,
  health_status health_status NOT NULL,
  confidence integer NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  details text,
  recommendations text[] NOT NULL DEFAULT '{}',
  detected_features jsonb,
  shape_description text,
  health_status_description text,
  user_notes text,
  symptoms text[] NOT NULL DEFAULT '{}',
  latitude numeric(9,6),
  longitude numeric(9,6),
  weather jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_poop_records_user_pet_time ON poop_records(user_id, pet_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_poop_records_health ON poop_records(health_status);
CREATE INDEX IF NOT EXISTS idx_poop_records_is_shared ON poop_records(is_shared) WHERE is_shared = true;
-- Optional external_id for cross-mapping
ALTER TABLE IF EXISTS poop_records ADD COLUMN IF NOT EXISTS external_id text UNIQUE;

-- Community
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES pets(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  status post_status NOT NULL DEFAULT 'published',
  category post_category NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  is_sticky boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  moderation_status moderation_status NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_status ON community_posts(category, status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON community_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS post_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  url text NOT NULL,
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  moderation_status moderation_status NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id);

-- Moderation & Reports
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post','comment')),
  target_id uuid NOT NULL,
  reason report_reason NOT NULL,
  description text,
  status moderation_status NOT NULL DEFAULT 'pending',
  reviewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  review_notes text,
  action moderation_action,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_target ON content_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON content_reports(status);

CREATE TABLE IF NOT EXISTS moderation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type moderation_rule_type NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  action moderation_action NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  is_active boolean NOT NULL DEFAULT true,
  applies_to text[] NOT NULL DEFAULT ARRAY['post','comment'],
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rules_is_active ON moderation_rules(is_active);

-- Revoked tokens for logout/blacklist
CREATE TABLE IF NOT EXISTS revoked_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  token_hash text NOT NULL UNIQUE,
  revoked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user ON revoked_tokens(user_id);

-- Notifications & Alerts (PG-native)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
  CREATE TYPE notification_type AS ENUM ('alert','system','community','reminder');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_category') THEN
  CREATE TYPE notification_category AS ENUM ('health','frequency','pattern','emergency','general');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
  CREATE TYPE notification_status AS ENUM ('unread','read','archived');
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
  CREATE TYPE notification_priority AS ENUM ('low','normal','high','urgent');
END IF; END $$;

-- Alert rules stored as JSONB config + simple stats
CREATE TABLE IF NOT EXISTS alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES pets(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  triggers jsonb NOT NULL DEFAULT '{}'::jsonb,        -- anomalyTypes[], severityLevels[], minimumConfidence
  notifications jsonb NOT NULL DEFAULT '{}'::jsonb,   -- inApp/email/push booleans
  frequency jsonb NOT NULL DEFAULT '{}'::jsonb,       -- maxPerDay/maxPerWeek/cooldownHours
  custom_conditions jsonb,                            -- additional thresholds
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,           -- totalTriggered, lastTriggered, totalNotificationsSent
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_rules_user_active ON alert_rules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_pet_active ON alert_rules(pet_id, is_active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_updated_at ON alert_rules(updated_at DESC);

-- Notifications table supporting filtering and aggregation
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES pets(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  category notification_category NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,                                          -- alertRuleId, anomalyType, severity, petName, actionUrl, metadata
  status notification_status NOT NULL DEFAULT 'unread',
  priority notification_priority NOT NULL DEFAULT 'normal',
  channels jsonb NOT NULL DEFAULT '{}'::jsonb,         -- inApp/email/push channels state
  scheduled_for timestamptz,
  expires_at timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,            -- viewCount, clickCount, lastViewedAt, lastClickedAt
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status_created ON notifications(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created ON notifications(user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_category_created ON notifications(user_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_priority_created ON notifications(user_id, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_status ON notifications(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);