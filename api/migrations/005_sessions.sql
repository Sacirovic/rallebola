CREATE TABLE IF NOT EXISTS sessions (
    id         VARCHAR(128) NOT NULL PRIMARY KEY,
    data       MEDIUMTEXT   NOT NULL,
    expires_at DATETIME     NOT NULL,
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
