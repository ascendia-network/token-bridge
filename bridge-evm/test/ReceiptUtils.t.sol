// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {BridgeTypes} from "../contracts/interface/BridgeTypes.sol";

import {ReceiptUtils} from "../contracts/utils/ReceiptUtils.sol";

contract ReceiptUtilsTest is Test {

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

    function fullReceipt2hash_check(
        string memory jsPath,
        BridgeTypes.FullReceipt memory receipt
    ) internal {
        string[] memory runJsInputs = new string[](14);
        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = jsPath;
        runJsInputs[2] = "--full";
        runJsInputs[3] = Strings.toHexString(uint256(receipt.from), 32);
        runJsInputs[4] = Strings.toHexString(uint256(receipt.to), 32);
        runJsInputs[5] =
            Strings.toHexString(uint256(receipt.tokenAddressFrom), 32);
        runJsInputs[6] =
            Strings.toHexString(uint256(receipt.tokenAddressTo), 32);
        runJsInputs[7] = Strings.toHexString(receipt.amountFrom, 32);
        runJsInputs[8] = Strings.toHexString(receipt.amountTo, 32);
        runJsInputs[9] = Strings.toHexString(receipt.chainFrom, 32);
        runJsInputs[10] = Strings.toHexString(receipt.chainTo, 32);
        runJsInputs[11] = Strings.toHexString(receipt.eventId, 32);
        runJsInputs[12] = Strings.toHexString(receipt.flags, 32);
        runJsInputs[13] = iToHex(receipt.data);

        // Run command and capture output

        bytes memory jsResult;
        try vm.ffi(runJsInputs) returns (bytes memory result) {
            jsResult = result;
        } catch {
            revert("JavaScript execution failed");
        }
        bytes32 jsGenerated = abi.decode(jsResult, (bytes32));

        bytes32 expectedHash = ReceiptUtils.toHash(receipt);
        assertEq(expectedHash, jsGenerated);
    }

    function miniReceipt2hash_check(
        string memory jsPath,
        BridgeTypes.MiniReceipt memory receipt
    ) internal {
        string[] memory runJsInputs = new string[](11);
        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = jsPath;
        runJsInputs[2] = "--mini";
        runJsInputs[3] = Strings.toHexString(uint256(receipt.to), 32);
        runJsInputs[4] =
            Strings.toHexString(uint256(receipt.tokenAddressTo), 32);
        runJsInputs[5] = Strings.toHexString(receipt.amountTo, 32);
        runJsInputs[6] = Strings.toHexString(receipt.chainFrom, 32);
        runJsInputs[7] = Strings.toHexString(receipt.chainTo, 32);
        runJsInputs[8] = Strings.toHexString(receipt.eventId, 32);
        runJsInputs[9] = Strings.toHexString(receipt.flags, 32);
        runJsInputs[10] = iToHex(receipt.data);

        // Run command and capture output

        bytes memory jsResult;
        try vm.ffi(runJsInputs) returns (bytes memory result) {
            jsResult = result;
        } catch {
            revert("JavaScript execution failed");
        }
        bytes32 jsGenerated = abi.decode(jsResult, (bytes32));

        bytes32 expectedHash = ReceiptUtils.toHash(receipt);
        assertEq(expectedHash, jsGenerated);
    }

    string constant JS_RECEIPT_HASH_ETHERS_PATH =
        "./test/differential_testing/receipt2hashEthers.js";

    function test_fuzz_fullReceipt2hash_ethers(
        bytes32 from, // source address (bytes32 because of cross-chain compatibility)
        bytes32 to, // destination address (bytes32 because of cross-chain compatibility)
        bytes32 tokenAddressFrom, // source token address (bytes32 because of cross-chain compatibility)
        bytes32 tokenAddressTo, // destination token address (bytes32 because of cross-chain compatibility)
        uint256 amountFrom, // amount of tokens sent
        uint256 amountTo, // amount of tokens received
        uint256 chainFrom, // chain id of the source chain
        uint256 chainTo, // chain id of the destination chain
        uint256 eventId, // transaction number
        uint256 flags, // flags for receiver
        bytes memory data // additional data of the transaction (eg. user nonce for Solana)
    ) public {
        // Validate inputs
        require(data.length <= 1024, "Data too large");
        require(amountFrom <= type(uint256).max, "Amount from overflow");
        require(amountTo <= type(uint256).max, "Amount to overflow");

        BridgeTypes.FullReceipt memory receipt = BridgeTypes.FullReceipt({
            from: from,
            to: to,
            tokenAddressFrom: tokenAddressFrom,
            tokenAddressTo: tokenAddressTo,
            amountFrom: amountFrom,
            amountTo: amountTo,
            chainFrom: chainFrom,
            chainTo: chainTo,
            eventId: eventId,
            flags: flags,
            data: data
        });

        fullReceipt2hash_check(JS_RECEIPT_HASH_ETHERS_PATH, receipt);
    }

    function test_fuzz_miniReceipt2hash_ethers(
        bytes32 to, // destination address (bytes32 because of cross-chain compatibility)
        bytes32 tokenAddressTo, // destination token address (bytes32 because of cross-chain compatibility)
        uint256 amountTo, // amount of tokens received
        uint256 chainFrom, // chain id of the source chain
        uint256 chainTo, // chain id of the destination chain
        uint256 eventId, // transaction number
        uint256 flags, // flags for receiver
        bytes memory data // additional data of the transaction (eg. user nonce for Solana)
    ) public {
        // Validate inputs
        require(data.length <= 1024, "Data too large");
        require(amountTo <= type(uint256).max, "Amount to overflow");

        BridgeTypes.MiniReceipt memory receipt = BridgeTypes.MiniReceipt({
            to: to,
            tokenAddressTo: tokenAddressTo,
            amountTo: amountTo,
            chainFrom: chainFrom,
            chainTo: chainTo,
            eventId: eventId,
            flags: flags,
            data: data
        });

        miniReceipt2hash_check(JS_RECEIPT_HASH_ETHERS_PATH, receipt);
    }

    string constant JS_RECEIPT_HASH_VIEM_PATH =
        "./test/differential_testing/receipt2hashViem.js";

    function test_fuzz_fullReceipt2hash_viem(
        bytes32 from, // source address (bytes32 because of cross-chain compatibility)
        bytes32 to, // destination address (bytes32 because of cross-chain compatibility)
        bytes32 tokenAddressFrom, // source token address (bytes32 because of cross-chain compatibility)
        bytes32 tokenAddressTo, // destination token address (bytes32 because of cross-chain compatibility)
        uint256 amountFrom, // amount of tokens sent
        uint256 amountTo, // amount of tokens received
        uint256 chainFrom, // chain id of the source chain
        uint256 chainTo, // chain id of the destination chain
        uint256 eventId, // transaction number
        uint256 flags, // flags for receiver
        bytes memory data // additional data of the transaction (eg. user nonce for Solana)
    ) public {
        // Validate inputs
        require(data.length <= 1024, "Data too large");
        require(amountFrom <= type(uint256).max, "Amount from overflow");
        require(amountTo <= type(uint256).max, "Amount to overflow");

        BridgeTypes.FullReceipt memory receipt = BridgeTypes.FullReceipt({
            from: from,
            to: to,
            tokenAddressFrom: tokenAddressFrom,
            tokenAddressTo: tokenAddressTo,
            amountFrom: amountFrom,
            amountTo: amountTo,
            chainFrom: chainFrom,
            chainTo: chainTo,
            eventId: eventId,
            flags: flags,
            data: data
        });

        fullReceipt2hash_check(JS_RECEIPT_HASH_VIEM_PATH, receipt);
    }

    function test_fuzz_miniReceipt2hash_viem(
        bytes32 to, // destination address (bytes32 because of cross-chain compatibility)
        bytes32 tokenAddressTo, // destination token address (bytes32 because of cross-chain compatibility)
        uint256 amountTo, // amount of tokens received
        uint256 chainFrom, // chain id of the source chain
        uint256 chainTo, // chain id of the destination chain
        uint256 eventId, // transaction number
        uint256 flags, // flags for receiver
        bytes memory data // additional data of the transaction (eg. user nonce for Solana)
    ) public {
        // Validate inputs
        require(data.length <= 1024, "Data too large");
        require(amountTo <= type(uint256).max, "Amount to overflow");

        BridgeTypes.MiniReceipt memory receipt = BridgeTypes.MiniReceipt({
            to: to,
            tokenAddressTo: tokenAddressTo,
            amountTo: amountTo,
            chainFrom: chainFrom,
            chainTo: chainTo,
            eventId: eventId,
            flags: flags,
            data: data
        });

        miniReceipt2hash_check(JS_RECEIPT_HASH_VIEM_PATH, receipt);
    }

}
