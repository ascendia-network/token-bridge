// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
pragma abicoder v2;

import "./DeployerBase.s.sol";

import {ITokenManager} from "../contracts/interface/ITokenManager.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract DeployExternalToken is DeployerBase {

    function run() public override {
        getDeployer();
        vm.startBroadcast(deployer.privateKey);
        getBridge();
        getBridgeSolana();
        bridgeSolana.deployExternalTokenERC20(
            ITokenManager.ExternalTokenUnmapped({
                externalTokenAddress: bytes32(uint256(11111111111111111111111111111111)),
                decimals: 6
            }),
            "Wrapped Solana",
            "wSOL",
            18
        );
        vm.stopBroadcast();
    }

}
