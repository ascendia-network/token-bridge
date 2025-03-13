// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
pragma abicoder v2;

import "./DeployerBase.s.sol";

import {AccessManager} from
    "@openzeppelin/contracts/access/manager/AccessManager.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract DeployBridgeSolana is DeployerBase {

    function run() public override {
        getDeployer();
        vm.startBroadcast(deployer.privateKey);
        getAuthority();
        getValidator();
        getTokenBeacon();

        (bool deployed, address bridgeAddress) = checkDeployed("BridgeSolana");
        if (deployed && !vm.envOr("FORCE_DEPLOY", false)) {
            console.log("Bridge already deployed at", bridgeAddress);
        } else {
            deployBridgeSolana();
        }
        vm.stopBroadcast();
    }

}
