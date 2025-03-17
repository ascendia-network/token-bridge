// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {BridgeTypes} from "../contracts/interface/BridgeTypes.sol";

import {PayloadUtils} from "../contracts/utils/PayloadUtils.sol";

contract PayloadUtilsTest is Test {

    function iToHex(
        bytes memory buffer
    ) public pure returns (string memory) {
        // Fixed buffer size for hexadecimal convertion
        bytes memory converted = new bytes(buffer.length * 2);

        bytes memory _base = "0123456789abcdef";

        for (uint256 i = 0; i < buffer.length; i++) {
            converted[i * 2] = _base[uint8(buffer[i]) / _base.length];
            converted[i * 2 + 1] = _base[uint8(buffer[i]) % _base.length];
        }

        return string(abi.encodePacked("0x", converted));
    }

    function payload2hash_check(
        string memory jsPath,
        BridgeTypes.SendPayload memory payload
    ) public {
        string[] memory runJsInputs = new string[](11);
        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = jsPath;
        runJsInputs[2] = Strings.toHexString(uint256(payload.chainFrom), 32);
        runJsInputs[3] = Strings.toHexString(uint256(payload.chainTo), 32);
        runJsInputs[4] = Strings.toHexString(uint256(payload.tokenAddress), 32);
        runJsInputs[5] = Strings.toHexString(uint256(payload.externalTokenAddress), 32);
        runJsInputs[6] = Strings.toHexString(payload.amountToSend, 32);
        runJsInputs[7] = Strings.toHexString(payload.feeAmount, 32);
        runJsInputs[8] = Strings.toHexString(payload.timestamp, 32);
        runJsInputs[9] = Strings.toHexString(payload.flags, 32);
        runJsInputs[10] = iToHex(payload.flagData);

        // Run command and capture output
        bytes memory jsResult = vm.ffi(runJsInputs);
        bytes32 jsGenerated = abi.decode(jsResult, (bytes32));

        bytes32 expectedHash = PayloadUtils.toHash(payload);
        assertEq(expectedHash, jsGenerated);
    }

    string constant JS_PAYLOAD_HASH_ETHERS_PATH = "./test/differential_testing/payload2hashEthers.js";

    function test_fuzz_payload2hash_ethers(
        uint256 chainFrom, // source chain id
        uint256 chainTo, // destination chain id
        bytes32 tokenAddress, // address of the token contract
        bytes32 externalTokenAddress, // address of the external token contract
        uint256 amountToSend, // amount of the tokens to be sent
        uint256 feeAmount, // amount of the fee
        uint256 timestamp, // timestamp of the fee was generated
        uint256 flags, // flags of the sending operation
        bytes memory flagData // additional data of the sending operation (unused for now)
    ) public {
        // Validate inputs
        vm.assume(chainFrom != 0);
        vm.assume(chainTo != 0);
        vm.assume(chainFrom != chainTo);
        require(flagData.length <= 1024, "Data too large");
        require(amountToSend <= type(uint256).max, "Amount to send overflow");
        require(feeAmount <= type(uint256).max, "Fee amount overflow");
        require(timestamp <= type(uint256).max, "Timestamp overflow");
        require(flags <= type(uint256).max, "Flags overflow");

        BridgeTypes.SendPayload memory payload = BridgeTypes.SendPayload({
            chainFrom: chainFrom,
            chainTo: chainTo,
            tokenAddress: tokenAddress,
            externalTokenAddress: externalTokenAddress,
            amountToSend: amountToSend,
            feeAmount: feeAmount,
            timestamp: timestamp,
            flags: flags,
            flagData: flagData
        });

        payload2hash_check(JS_PAYLOAD_HASH_ETHERS_PATH, payload);
    }

    string constant JS_PAYLOAD_HASH_VIEM_PATH = "./test/differential_testing/payload2hashViem.js";

    function test_fuzz_payload2hash_viem(
        uint256 chainFrom, // source chain id
        uint256 chainTo, // destination chain id
        bytes32 tokenAddress, // address of the token contract
        bytes32 externalTokenAddress, // address of the external token contract
        uint256 amountToSend, // amount of the tokens to be sent
        uint256 feeAmount, // amount of the fee
        uint256 timestamp, // timestamp of the fee was generated
        uint256 flags, // flags of the sending operation
        bytes memory flagData // additional data of the sending operation (unused for now)
    ) public {
        vm.assume(chainFrom != 0);
        vm.assume(chainTo != 0);
        vm.assume(chainFrom != chainTo);
        // Validate inputs
        require(flagData.length <= 1024, "Data too large");
        require(amountToSend <= type(uint256).max, "Amount to send overflow");
        require(feeAmount <= type(uint256).max, "Fee amount overflow");
        require(timestamp <= type(uint256).max, "Timestamp overflow");
        require(flags <= type(uint256).max, "Flags overflow");

        BridgeTypes.SendPayload memory payload = BridgeTypes.SendPayload({
            chainFrom: chainFrom,
            chainTo: chainTo,
            tokenAddress: tokenAddress,
            externalTokenAddress: externalTokenAddress,
            amountToSend: amountToSend,
            feeAmount: feeAmount,
            timestamp: timestamp,
            flags: flags,
            flagData: flagData
        });

        payload2hash_check(JS_PAYLOAD_HASH_VIEM_PATH, payload);
    }

}
