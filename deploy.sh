#!/usr/bin/env bash
set -e

echo "Building images..."
docker build -t rallebola-api          ./api
docker build -f ./frontend/Dockerfile.prod \
             -t rallebola-frontend-prod ./frontend

echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo "Waiting for database..."
until docker compose -f docker-compose.prod.yml exec -T db \
  sh -c 'mysqladmin ping -h localhost -u root -p"$MYSQL_ROOT_PASSWORD" --silent' 2>/dev/null; do
  sleep 2
done

echo "Running migrations..."
for f in $(ls ./api/migrations/*.sql | sort); do
  echo "  → $(basename "$f")"
  docker compose -f docker-compose.prod.yml exec -T db \
    sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < "$f"
done

echo "Done. App is live on port 80."
