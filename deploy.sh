#!/bin/sh
# Updates the backend on the EC2 server to the latest code on main.
#
# Run on the EC2 box, from the repo folder:
#   cd ~/bikeride && git pull && ./deploy.sh
#
# Keeps the running container's settings (DATABASE_URL, JWT_SECRET, ...),
# rebuilds the image, restarts the container (database migrations run on
# start) and checks the API answers.
set -e

NAME=bikeride-backend
ENV_FILE="$HOME/$NAME.env"
cd "$(dirname "$0")"

echo "==> Code: $(git log -1 --oneline)"

# Save the current container's settings the first time (or refresh them).
if docker inspect "$NAME" >/dev/null 2>&1; then
  docker inspect "$NAME" --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | grep -v -e '^PATH=' -e '^NODE_VERSION=' -e '^YARN_VERSION=' -e '^$' > "$ENV_FILE.new"
  mv "$ENV_FILE.new" "$ENV_FILE"
fi
if [ ! -s "$ENV_FILE" ] || ! grep -q '^DATABASE_URL=' "$ENV_FILE"; then
  echo "!! No settings found in $ENV_FILE (DATABASE_URL missing). Nothing was changed."
  exit 1
fi
echo "==> Settings kept in $ENV_FILE"

echo "==> Building backend image"
docker build -t "$NAME" backend

echo "==> Restarting container"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped -p 5000:5000 --env-file "$ENV_FILE" "$NAME" >/dev/null

echo "==> Waiting for the API (migrations run first)"
for i in $(seq 1 30); do
  if curl -fs http://localhost:5000/health >/dev/null 2>&1; then
    docker logs --tail 15 "$NAME"
    echo "==> Backend is up"
    exit 0
  fi
  sleep 2
done

docker logs --tail 40 "$NAME"
echo "!! Backend did not answer on /health - see the logs above."
exit 1
