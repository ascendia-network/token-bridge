#!/bin/bash
set -e

# install docker by default
if [[ -z $NO_DOCKER_INSTALL ]]; then
    apt-get remove -y docker docker-engine docker.io containerd runc && \
    apt-get update && \
    apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    mkdir -p /etc/apt/keyrings

    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

echo "Please enter mnemonic (seed phrase)"

read -sp 'Mnemonic: ' MNEMONIC

if [ -z "$MNEMONIC" ]; then
  echo "Mnemonic is required"
  exit 1
fi

set +e
docker rm -f bridge-v2-relay
set -e

IMAGE=ghcr.io/ascendia-network/token-bridge/relay
POLLING_INTERVAL=60000
RPC_URL_22040=https://network.ambrosus-test.io
RPC_URL_16718=https://network.ambrosus.io/
STAGE=${STAGE:-prod}
if [ "$STAGE" == "prod" ]; then
  TAG=main
  BACKEND_URL=https://bridge-v2-api.ascendia.network
elif [ "$STAGE" == "test" ]; then
  TAG=dev
  BACKEND_URL=https://bridge-v2-api.ambrosus-test.io
elif [ "$STAGE" == "dev" ]; then
  TAG=dev
  BACKEND_URL=https://bridge-v2-api.ambrosus-test.io
fi

CONTAINER_NAME=$IMAGE:$TAG

docker pull "$CONTAINER_NAME"

echo "Starting relay..."
docker run -d \
--name bridge-v2-relay \
--restart unless-stopped \
-e STAGE="$STAGE" \
-e MNEMONIC="$MNEMONIC" \
-e BACKEND_URL="$BACKEND_URL" \
-e POLLING_INTERVAL=$POLLING_INTERVAL \
-e RPC_URL_22040=$RPC_URL_22040 \
-e RPC_URL_16718=$RPC_URL_16718 \
"$CONTAINER_NAME" >> /dev/null

sleep 10
docker logs bridge-v2-relay