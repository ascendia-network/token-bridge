// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
pragma abicoder v2;

import "./DeployerBase.s.sol";

import {ITokenManager} from "../contracts/interface/ITokenManager.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract AddTokensToBridge is DeployerBase {

    struct TokenInfoJsonEntry {
        address addressLocal;
        uint64 chainId;
        uint8 decimals;
        uint8 externalDecimals;
        string externalTokenAddress;
        bytes32 externalTokenAddressHex;
        string name;
        string symbol;
        bool unpaused;
    }

    function loadTokensInfo(
        string memory path
    ) public view returns (TokenInfoJsonEntry[] memory) {
        try vm.readFile(path) returns (string memory json) {
            bytes memory data = vm.parseJson(json);
            TokenInfoJsonEntry[] memory tokensInfo =
                abi.decode(data, (TokenInfoJsonEntry[]));
            return tokensInfo;
        } catch (bytes memory error) {
            console.log("Error reading tokens info");
            console.log(vm.toString(error));
            revert();
        } catch Error(string memory reason) {
            console.log("Error reading tokens info");
            console.log(reason);
            revert();
        }
    }

    function run() public override {
        getDeployer();
        vm.startBroadcast(deployer.privateKey);
        getBridgeSolana();

        TokenInfoJsonEntry[] memory tokensInfo =
            loadTokensInfo("script/tokens.json");
        for (uint256 i = 0; i < tokensInfo.length; i++) {
            console.log("Adding token:");
            console.log("\tName", tokensInfo[i].name);
            console.log("\tSymbol", tokensInfo[i].symbol);
            console.log("\tExternal Chain ID", tokensInfo[i].chainId);
            console.log(
                "\tExternal Address", tokensInfo[i].externalTokenAddress
            );
            console.log("\tExternal Decimals", tokensInfo[i].externalDecimals);
            console.log("\tAddress", tokensInfo[i].addressLocal);
            console.log("\tDecimals", tokensInfo[i].decimals);
            if (tokensInfo[i].addressLocal != address(0)) {
                bridgeSolana.addToken(
                    tokensInfo[i].addressLocal,
                    ITokenManager.ExternalTokenUnmapped({
                        externalTokenAddress: tokensInfo[i].externalTokenAddressHex,
                        decimals: tokensInfo[i].externalDecimals,
                        chainId: tokensInfo[i].chainId
                    }),
                    !tokensInfo[i].unpaused
                );
                console.log("Token added");
            } else {
                address token = bridgeSolana.deployExternalTokenERC20(
                    ITokenManager.ExternalTokenUnmapped({
                        externalTokenAddress: tokensInfo[i].externalTokenAddressHex,
                        decimals: tokensInfo[i].externalDecimals,
                        chainId: tokensInfo[i].chainId
                    }),
                    tokensInfo[i].name,
                    tokensInfo[i].symbol,
                    tokensInfo[i].decimals
                );
                if (tokensInfo[i].unpaused) {
                    bridgeSolana.unpauseToken(token);
                }
                console.log("Token deployed", token);
            }
            console.log("-------------------");
        }
        vm.stopBroadcast();
    }

}
