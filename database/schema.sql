PRAGMA foreign_keys = ON;

-- 内容后台：一条记录对应前台一张卡片和一个详情页。
-- 业务字段保存在 payload_json；title、method_name、status 单独保存用于列表和发布查询。
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);

-- 后台权限基础层：只有超级管理员和普通管理员两种账号类型。
-- 普通管理员的具体权限通过 admin_user_permissions 逐项配置。
CREATE TABLE IF NOT EXISTS admin_user_access (
  user_id TEXT PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL DEFAULT 'admin'
    CHECK (account_type IN ('super_admin','admin')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_permission_catalog (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  permission_group TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admin_user_permissions (
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES admin_permission_catalog(code) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_admin_user_permissions_user
  ON admin_user_permissions(user_id, enabled);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_contents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  method_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','ready','published','withdrawn','archived')),
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER,
  withdrawn_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES admin_users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_contents_status_updated
  ON admin_contents(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry
  ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created
  ON admin_audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS anthology_columns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#E8EEE9',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 外部文章来源映射。同一来源文章只对应一条小青囊审核稿，重复同步只更新。
CREATE TABLE IF NOT EXISTS anthology_source_links (
  source_key TEXT NOT NULL,
  external_id TEXT NOT NULL,
  content_id TEXT NOT NULL UNIQUE REFERENCES admin_contents(id) ON DELETE CASCADE,
  source_updated_at TEXT,
  raw_hash TEXT NOT NULL DEFAULT '',
  synced_at INTEGER NOT NULL,
  source_missing INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (source_key, external_id)
);

CREATE INDEX IF NOT EXISTS idx_anthology_source_content
  ON anthology_source_links(content_id);

-- 外部文章目录候选。扫描阶段只保存标题、摘要和筛选建议，不抓取或改写正文。
CREATE TABLE IF NOT EXISTS anthology_source_candidates (
  source_key TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT '',
  suggested_type TEXT NOT NULL DEFAULT 'article',
  screening_flags TEXT NOT NULL DEFAULT '[]',
  screening_status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (screening_status IN ('candidate','selected','ignored','imported')),
  scanned_at INTEGER NOT NULL,
  PRIMARY KEY (source_key, external_id)
);

CREATE INDEX IF NOT EXISTS idx_anthology_source_candidate_status
  ON anthology_source_candidates(source_key, screening_status, scanned_at DESC);

-- 可复用穴位库：只保存“在哪里、怎么找”，具体操作仍属于方法。
CREATE TABLE IF NOT EXISTS admin_points (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  body_area_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','verified','archived')),
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  verified_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_admin_points_status_updated
  ON admin_points(status, updated_at DESC);

-- 问题库是用户表达与内容之间的索引，不在这里重复保存方法正文。
CREATE TABLE IF NOT EXISTS admin_problems (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','verified','archived')),
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  verified_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1
);

-- 关联单独建表：基础资料只维护一次，方法只保存调用顺序与本方法特有说明。
CREATE TABLE IF NOT EXISTS content_point_links (
  content_id TEXT NOT NULL REFERENCES admin_contents(id) ON DELETE CASCADE,
  point_id TEXT NOT NULL REFERENCES admin_points(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  instruction TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (content_id, point_id)
);

CREATE TABLE IF NOT EXISTS problem_content_links (
  problem_id TEXT NOT NULL REFERENCES admin_problems(id) ON DELETE RESTRICT,
  content_id TEXT NOT NULL REFERENCES admin_contents(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'pending'
    CHECK (evidence_type IN ('direct','case','author','pending')),
  evidence_text TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (problem_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_problems_status_updated
  ON admin_problems(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_point_links_point
  ON content_point_links(point_id, content_id);
CREATE INDEX IF NOT EXISTS idx_problem_content_links_content
  ON problem_content_links(content_id, problem_id);
