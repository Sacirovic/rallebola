#!/usr/bin/env bash
set -e

echo "Building images..."
docker build -t rallebola-api          ./api
docker build -f ./frontend/Dockerfile.prod \
             -t rallebola-frontend-prod ./frontend

echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo "Done. App is live on port 80."
