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
        getBridgeSolana();
        address token = bridgeSolana.deployExternalTokenERC20(
            ITokenManager.ExternalTokenUnmapped({
                externalTokenAddress: bytes32(
                    0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001
                ),
                decimals: 6,
                chainId: uint64(bytes8("SOLANADN"))
            }),
            "Wrapped Solana",
            "wSOL",
            18
        );
        bridgeSolana.unpauseToken(token);
        vm.stopBroadcast();
    }

}
