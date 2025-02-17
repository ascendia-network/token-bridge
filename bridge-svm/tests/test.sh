#!/bin/bash

pkill -f solana-test-validator
sleep 1

solana-test-validator --reset &
# Wait for the validator to start
sleep 1

anchor build
#anchor deploy
anchor test --skip-local-validator

#pkill -f solana-test-validator
