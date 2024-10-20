#!/bin/bash

# check dependencies are available.
for i in jq curl sui; do
  if ! command -V ${i} 2>/dev/null; then
    echo "${i} is not installed"
    exit 1
  fi
done

NETWORK=http://localhost:9000

if [ $# -ne 0 ]; then
  if [ $1 = "devnet" ]; then
    NETWORK="https://fullnode.devnet.sui.io:443"
  fi
  if [ $1 = "testnet" ]; then
    NETWORK="https://fullnode.testnet.sui.io:443"
  fi
  if [ $1 = "mainnet" ]; then
    NETWORK="https://fullnode.mainnet.sui.io:443"
  fi
fi

echo "- Admin Address is: ${ADMIN_ADDRESS}"

import_address=$(sui keytool import "$ADMIN_PHRASE" ed25519)

switch_res=$(sui client switch --address ${ADMIN_ADDRESS})

ACTIVE_ADMIN_ADDRESS=$(sui client active-address)
echo "Admin address used for publishing: ${ACTIVE_ADMIN_ADDRESS}"
ACTIVE_NETWORK=$(sui client active-env)
echo "Environment used is: ${ACTIVE_NETWORK}"

publish_res=$(sui client publish --gas-budget 1000000000 --json ../kelp)

echo ${publish_res} >.publish.res.json

# Check if the command succeeded (exit status 0)
if [[ "$publish_res" =~ "error" ]]; then
  # If yes, print the error message and exit the script
  echo "Error during move contract publishing.  Details : $publish_res"
  exit 1
fi

PACKAGE_ID=$(echo "${publish_res}" | jq -r '.effects.created[] | select(.owner == "Immutable").reference.objectId')

newObjs=$(echo "$publish_res" | jq -r '.objectChanges[] | select(.type == "created")')

KELP_REGISTRY_ID=$(echo "$newObjs" | jq -r 'select (.objectType | contains("::kelp::KelpRegistry")).objectId')

PUBLISHER_ID=$(echo "$newObjs" | jq -r 'select (.objectType | contains("package::Publisher")).objectId')

UPGRADE_CAP_ID=$(echo "$newObjs" | jq -r 'select (.objectType | contains("package::UpgradeCap")).objectId')

suffix=""
if [ $# -eq 0 ]; then
  suffix=".localnet"
fi

cat >.env<<-ENV
PACKAGE_ID=$PACKAGE_ID
KELP_REGISTRY_ID=$KELP_REGISTRY_ID
PUBLISHER_ID=$PUBLISHER_ID
UPGRADE_CAP_ID=$UPGRADE_CAP_ID
ENV

echo "Contracts Deployment finished!"