CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lists (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id),
  name       VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  list_id    INT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  quantity   INT NOT NULL DEFAULT 1,
  notes      TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS list_shares (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  list_id             INT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  shared_with_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission          ENUM('view','edit') NOT NULL DEFAULT 'view',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_share (list_id, shared_with_user_id)
);

CREATE TABLE IF NOT EXISTS borrow_requests (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  item_id      INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       ENUM('pending','approved','rejected','returned') NOT NULL DEFAULT 'pending',
  message      TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_request (item_id, requester_id)
);
