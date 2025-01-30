// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {BridgeTestBase} from "./bridge_tests/BridgeBase.t.sol";
import {TokenManagerTest} from "./bridge_tests/TokenManager.t.sol";
import {BridgeRestrictedTest} from "./bridge_tests/BridgeRestricted.t.sol";
import {BridgeValidationTest} from "./bridge_tests/BridgeValidation.t.sol";

contract BridgeTest is 
    BridgeTestBase, 
    TokenManagerTest, 
    BridgeRestrictedTest, 
    BridgeValidationTest 
{}
