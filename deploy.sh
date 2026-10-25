#!/bin/sh
# Updates the backend on the EC2 server to the latest code on main.
# (First time on a new server: run deploy/ec2-setup.sh instead.)
#
# On the server:
#   cd ~/bikeride && git pull && sh deploy.sh
#
# Rebuilds the backend and restarts it; the database and its data are kept,
# and migrations run on start.
set -e
cd "$(dirname "$0")"

if [ ! -f deploy/.env ]; then
  echo "!! deploy/.env not found - this server isn't set up yet. Run: sh deploy/ec2-setup.sh https://<your-amplify-site>"
  exit 1
fi

echo "==> Code: $(git log -1 --oneline)"
COMPOSE="sudo docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env"
$COMPOSE up -d --build

HOST=$(grep '^PUBLIC_HOST=' deploy/.env | cut -d= -f2)
echo "==> Waiting for the API (migrations run first)"
for i in $(seq 1 40); do
  if curl -fs "https://$HOST/health" >/dev/null 2>&1; then
    $COMPOSE logs --tail 10 backend
    echo "==> Backend is up: https://$HOST"
    exit 0
  fi
  sleep 3
done
$COMPOSE logs --tail 40 backend
echo "!! Backend did not answer on https://$HOST/health - see the logs above."
exit 1
