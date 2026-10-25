#!/bin/sh
# One-time setup of a fresh EC2 server (Amazon Linux 2023) for the BikeRide
# backend. Run on the server:
#
#   sudo dnf install -y git
#   git clone https://github.com/michellejaiwhite98765-design/bike-ride-project.git bikeride
#   cd bikeride && sh deploy/ec2-setup.sh https://main.xxxxxxxx.amplifyapp.com
#
# The argument is your Amplify site address (for CORS). It installs Docker,
# adds swap (free-tier servers have 1 GB RAM), writes deploy/.env with fresh
# secrets and starts database + backend + HTTPS. At the end it prints the
# two values to put into Amplify.
set -e
cd "$(dirname "$0")/.."

CLIENT_URL="$1"
if [ -z "$CLIENT_URL" ]; then
  echo "Usage: sh deploy/ec2-setup.sh https://<your-amplify-site>"
  exit 1
fi

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  sudo dnf install -y docker
  sudo systemctl enable --now docker
fi
if ! sudo docker compose version >/dev/null 2>&1; then
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi
if ! sudo docker buildx version >/dev/null 2>&1; then
  sudo curl -fsSL "https://github.com/docker/buildx/releases/download/v0.17.1/buildx-v0.17.1.linux-$( [ "$(uname -m)" = "aarch64" ] && echo arm64 || echo amd64)" \
    -o /usr/local/lib/docker/cli-plugins/docker-buildx
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx
fi

echo "==> Adding 2 GB swap (needed to build on a 1 GB server)"
if ! swapon --show | grep -q /swapfile; then
  sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q /swapfile /etc/fstab || echo "/swapfile swap swap defaults 0 0" | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> Finding this server's public address"
TOKEN=$(curl -fs -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
IP=$(curl -fs -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)
if [ -z "$IP" ]; then
  echo "!! This server has no public IP. Give it one (Elastic IP) and run again."
  exit 1
fi
# sslip.io turns the IP into a hostname, so HTTPS works without buying a domain.
PUBLIC_HOST="$(echo "$IP" | tr . -).sslip.io"

if [ -f deploy/.env ]; then
  echo "==> Keeping existing deploy/.env (secrets unchanged); updating address and site"
  sed -i "s|^PUBLIC_HOST=.*|PUBLIC_HOST=$PUBLIC_HOST|; s|^CLIENT_URL=.*|CLIENT_URL=$CLIENT_URL|" deploy/.env
else
  echo "==> Writing deploy/.env with new secrets"
  cat > deploy/.env <<EOF
PUBLIC_HOST=$PUBLIC_HOST
CLIENT_URL=$CLIENT_URL
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d
PAYMENT_KEY_ID=mock
PAYMENT_KEY_SECRET=$(openssl rand -hex 16)
PAYMENT_WEBHOOK_SECRET=$(openssl rand -hex 16)
PLATFORM_FEE_FLAT=5
# Vehicle photos (Cloudinary) and RC check (Way2API) - fill these in, then run ./deploy.sh
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
WAY2API_API_KEY=
EOF
  chmod 600 deploy/.env
fi

echo "==> Building and starting (first build takes a few minutes)"
sudo docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build

echo "==> Waiting for the API over HTTPS"
for i in $(seq 1 60); do
  if curl -fs "https://$PUBLIC_HOST/health" >/dev/null 2>&1; then
    echo
    echo "=========================================================="
    echo " Backend is up:  https://$PUBLIC_HOST/health"
    echo
    echo " In Amplify -> your app -> Hosting -> Environment variables:"
    echo "   VITE_API_BASE_URL = https://$PUBLIC_HOST/api"
    echo "   VITE_SOCKET_URL   = https://$PUBLIC_HOST"
    echo " then redeploy the frontend in Amplify."
    echo "=========================================================="
    exit 0
  fi
  sleep 5
done
sudo docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs --tail 40
echo "!! Not answering on https://$PUBLIC_HOST yet. Check ports 80 and 443 are open in the security group."
exit 1
