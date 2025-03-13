// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {BridgeTypes} from "../contracts/interface/BridgeTypes.sol";
import {PayloadUtils} from "../contracts/utils/PayloadUtils.sol";
import {ReceiptUtils} from "../contracts/utils/ReceiptUtils.sol";

contract SignatureDifferetialTest is Test {

    using ReceiptUtils for BridgeTypes.FullReceipt;
    using ReceiptUtils for BridgeTypes.MiniReceipt;
    using PayloadUtils for BridgeTypes.SendPayload;

    struct Signer {
        address Address;
        uint256 PK;
    }

    Signer commonSigner;

    BridgeTypes.SendPayload payloadCommon;
    BridgeTypes.FullReceipt receiptCommon;
    BridgeTypes.MiniReceipt miniReceiptCommon;

    address fakeToken = address(0xF4143);

    function setUp() public {
        payloadCommon = BridgeTypes.SendPayload({
            destChainId: uint256(bytes32("SOLANA")),
            tokenAddress: bytes32(uint256(uint160(fakeToken))),
            externalTokenAddress: bytes32("SOLANA_TOKEN"),
            amountToSend: 100 ether,
            feeAmount: 1 ether,
            timestamp: block.timestamp,
            flags: 0,
            flagData: bytes("SOME_USEFUL_DATA")
        });

        receiptCommon = BridgeTypes.FullReceipt({
            from: bytes32("GOOD_SENDER"),
            to: bytes32("GOOD_RECEIVER"),
            tokenAddressFrom: bytes32("SOLANA"),
            tokenAddressTo: bytes32(uint256(uint160(fakeToken))),
            amountFrom: 100 ether,
            amountTo: 100 ether,
            chainFrom: 1,
            chainTo: 2,
            eventId: 1,
            flags: 0,
            data: bytes("SOME_USEFUL_DATA")
        });

        miniReceiptCommon = receiptCommon.asMini();

        (address psigner, uint256 psignerPk) = makeAddrAndKey("commonSigner");
        commonSigner = Signer(psigner, psignerPk);
    }

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

    function signPayload(
        BridgeTypes.SendPayload memory payload,
        Signer memory signer
    ) internal pure returns (bytes memory signature) {
        bytes32 digest = payload.toHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signer.PK, digest);
        signature = abi.encodePacked(r, s, v);
        return signature;
    }

    function signReceipt(
        BridgeTypes.MiniReceipt memory receipt,
        Signer memory signer
    ) internal pure returns (bytes memory signature) {
        bytes32 digest = receipt.toHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signer.PK, digest);
        bytes memory signerSignature = abi.encodePacked(r, s, v); // note the order here is different from line above.
        return signerSignature;
    }

    string constant JS_RECEIPT_SIGN_ETHERS_PATH = "./test/differential_testing/signReceiptEthers.js";

    function test_fullReceiptSign_ethers() public {
        string[] memory runJsInputs = new string[](15);

        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = JS_RECEIPT_SIGN_ETHERS_PATH;
        runJsInputs[2] = "--full";
        runJsInputs[3] = Strings.toHexString(uint256(receiptCommon.from), 32);
        runJsInputs[4] = Strings.toHexString(uint256(receiptCommon.to), 32);
        runJsInputs[5] = Strings.toHexString(uint256(receiptCommon.tokenAddressFrom), 32);
        runJsInputs[6] = Strings.toHexString(uint256(receiptCommon.tokenAddressTo), 32);
        runJsInputs[7] = Strings.toHexString(receiptCommon.amountFrom, 32);
        runJsInputs[8] = Strings.toHexString(receiptCommon.amountTo, 32);
        runJsInputs[9] = Strings.toHexString(receiptCommon.chainFrom, 32);
        runJsInputs[10] = Strings.toHexString(receiptCommon.chainTo, 32);
        runJsInputs[11] = Strings.toHexString(receiptCommon.eventId, 32);
        runJsInputs[12] = Strings.toHexString(receiptCommon.flags, 32);
        runJsInputs[13] = iToHex(receiptCommon.data);
        runJsInputs[14] = Strings.toHexString(commonSigner.PK, 32);

        // Run command and capture output

        bytes memory jsResult;
        try vm.ffi(runJsInputs) returns (bytes memory result) {
            jsResult = result;
        } catch {
            revert("JavaScript execution failed");
        }

        bytes memory expectedSignature = signReceipt(receiptCommon.asMini(), commonSigner);
        assertEq(expectedSignature, jsResult);
    }

    function test_fuzz_fullReceiptSign_ethers(
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
        bytes memory data, // additional data of the transaction (eg. user nonce for Solana)
        string memory signerSeed // signer seed
    ) public {
        // Validate inputs
        require(data.length <= 1024, "Data too large");
        require(amountFrom <= type(uint256).max, "Amount from overflow");
        require(amountTo <= type(uint256).max, "Amount to overflow");

        (address psigner, uint256 psignerPk) = makeAddrAndKey(signerSeed);
        Signer memory signer = Signer(psigner, psignerPk);

        string[] memory runJsInputs = new string[](15);
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

        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = JS_RECEIPT_SIGN_ETHERS_PATH;
        runJsInputs[2] = "--full";
        runJsInputs[3] = Strings.toHexString(uint256(from), 32);
        runJsInputs[4] = Strings.toHexString(uint256(to), 32);
        runJsInputs[5] = Strings.toHexString(uint256(tokenAddressFrom), 32);
        runJsInputs[6] = Strings.toHexString(uint256(tokenAddressTo), 32);
        runJsInputs[7] = Strings.toHexString(amountFrom, 32);
        runJsInputs[8] = Strings.toHexString(amountTo, 32);
        runJsInputs[9] = Strings.toHexString(chainFrom, 32);
        runJsInputs[10] = Strings.toHexString(chainTo, 32);
        runJsInputs[11] = Strings.toHexString(eventId, 32);
        runJsInputs[12] = Strings.toHexString(flags, 32);
        runJsInputs[13] = iToHex(data);
        runJsInputs[14] = Strings.toHexString(signer.PK, 32);

        // Run command and capture output

        bytes memory jsResult;
        try vm.ffi(runJsInputs) returns (bytes memory result) {
            jsResult = result;
        } catch {
            revert("JavaScript execution failed");
        }

        bytes memory expectedSignature = signReceipt(receipt.asMini(), signer);
        assertEq(expectedSignature, jsResult);
    }

    function test_miniReceiptSign_ethers() public {
        string[] memory runJsInputs = new string[](12);

        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = JS_RECEIPT_SIGN_ETHERS_PATH;
        runJsInputs[2] = "--mini";
        runJsInputs[3] = Strings.toHexString(uint256(miniReceiptCommon.to), 32);
        runJsInputs[4] = Strings.toHexString(uint256(miniReceiptCommon.tokenAddressTo), 32);
        runJsInputs[5] = Strings.toHexString(miniReceiptCommon.amountTo, 32);
        runJsInputs[6] = Strings.toHexString(miniReceiptCommon.chainFrom, 32);
        runJsInputs[7] = Strings.toHexString(miniReceiptCommon.chainTo, 32);
        runJsInputs[8] = Strings.toHexString(miniReceiptCommon.eventId, 32);
        runJsInputs[9] = Strings.toHexString(miniReceiptCommon.flags, 32);
        runJsInputs[10] = iToHex(miniReceiptCommon.data);
        runJsInputs[11] = Strings.toHexString(commonSigner.PK, 32);

        // Run command and capture output

        bytes memory jsResult;
        try vm.ffi(runJsInputs) returns (bytes memory result) {
            jsResult = result;
        } catch {
            revert("JavaScript execution failed");
        }

        bytes memory expectedSignature = signReceipt(miniReceiptCommon, commonSigner);
        assertEq(expectedSignature, jsResult);
    }

    function test_fuzz_miniReceiptSign_ethers(
        bytes32 to, // destination address (bytes32 because of cross-chain compatibility)
        bytes32 tokenAddressTo, // destination token address (bytes32 because of cross-chain compatibility)
        uint256 amountTo, // amount of tokens received
        uint256 chainFrom, // chain id of the source chain
        uint256 chainTo, // chain id of the destination chain
        uint256 eventId, // transaction number
        uint256 flags, // flags for receiver
        bytes memory data, // additional data of the transaction (eg. user nonce for Solana)
        string memory signerSeed // signer seed
    ) public {
        // Validate inputs
        require(data.length <= 1024, "Data too large");
        require(amountTo <= type(uint256).max, "Amount to overflow");

        (address psigner, uint256 psignerPk) = makeAddrAndKey(signerSeed);
        Signer memory signer = Signer(psigner, psignerPk);

        string[] memory runJsInputs = new string[](12);
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

        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = JS_RECEIPT_SIGN_ETHERS_PATH;
        runJsInputs[2] = "--mini";
        runJsInputs[3] = Strings.toHexString(uint256(to), 32);
        runJsInputs[4] = Strings.toHexString(uint256(tokenAddressTo), 32);
        runJsInputs[5] = Strings.toHexString(amountTo, 32);
        runJsInputs[6] = Strings.toHexString(chainFrom, 32);
        runJsInputs[7] = Strings.toHexString(chainTo, 32);
        runJsInputs[8] = Strings.toHexString(eventId, 32);
        runJsInputs[9] = Strings.toHexString(flags, 32);
        runJsInputs[10] = iToHex(data);
        runJsInputs[11] = Strings.toHexString(signer.PK, 32);

        bytes memory jsResult;
        try vm.ffi(runJsInputs) returns (bytes memory result) {
            jsResult = result;
        } catch {
            revert("JavaScript execution failed");
        }

        bytes memory expectedSignature = signReceipt(receipt, signer);
        assertEq(expectedSignature, jsResult);
    }

    string constant JS_RECEIPT_SIGN_VIEM_PATH = "./test/differential_testing/signReceiptViem.js";

    function test_fullReceiptSign_viem() public {
        string[] memory runJsInputs = new string[](15);

        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = JS_RECEIPT_SIGN_VIEM_PATH;
        runJsInputs[2] = "--full";
        runJsInputs[3] = Strings.toHexString(uint256(receiptCommon.from), 32);
        runJsInputs[4] = Strings.toHexString(uint256(receiptCommon.to), 32);
        runJsInputs[5] = Strings.toHexString(uint256(receiptCommon.tokenAddressFrom), 32);
        runJsInputs[6] = Strings.toHexString(uint256(receiptCommon.tokenAddressTo), 32);
        runJsInputs[7] = Strings.toHexString(receiptCommon.amountFrom, 32);
        runJsInputs[8] = Strings.toHexString(receiptCommon.amountTo, 32);
        runJsInputs[9] = Strings.toHexString(receiptCommon.chainFrom, 32);
        runJsInputs[10] = Strings.toHexString(receiptCommon.chainTo, 32);
        runJsInputs[11] = Strings.toHexString(receiptCommon.eventId, 32);
        runJsInputs[12] = Strings.toHexString(receiptCommon.flags, 32);
        runJsInputs[13] = iToHex(receiptCommon.data);
        runJsInputs[14] = Strings.toHexString(commonSigner.PK, 32);

        // Run command and capture output

        bytes memory jsResult;
        try vm.ffi(runJsInputs) returns (bytes memory result) {
            jsResult = result;
        } catch {
            revert("JavaScript execution failed");
        }

        bytes memory expectedSignature = signReceipt(receiptCommon.asMini(), commonSigner);
        assertEq(expectedSignature, jsResult);
    }

    function test_fuzz_fullReceiptSign_viem(
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
        bytes memory data, // additional data of the transaction (eg. user nonce for Solana)
        string memory signerSeed // signer seed
    ) public {
        // Validate inputs
        require(data.length <= 1024, "Data too large");
        require(amountFrom <= type(uint256).max, "Amount from overflow");
        require(amountTo <= type(uint256).max, "Amount to overflow");

        (address psigner, uint256 psignerPk) = makeAddrAndKey(signerSeed);
        Signer memory signer = Signer(psigner, psignerPk);

        string[] memory runJsInputs = new string[](15);
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

        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = JS_RECEIPT_SIGN_VIEM_PATH;
        runJsInputs[2] = "--full";
        runJsInputs[3] = Strings.toHexString(uint256(from), 32);
        runJsInputs[4] = Strings.toHexString(uint256(to), 32);
        runJsInputs[5] = Strings.toHexString(uint256(tokenAddressFrom), 32);
        runJsInputs[6] = Strings.toHexString(uint256(tokenAddressTo), 32);
        runJsInputs[7] = Strings.toHexString(amountFrom, 32);
        runJsInputs[8] = Strings.toHexString(amountTo, 32);
        runJsInputs[9] = Strings.toHexString(chainFrom, 32);
        runJsInputs[10] = Strings.toHexString(chainTo, 32);
        runJsInputs[11] = Strings.toHexString(eventId, 32);
        runJsInputs[12] = Strings.toHexString(flags, 32);
        runJsInputs[13] = iToHex(data);
        runJsInputs[14] = Strings.toHexString(signer.PK, 32);

        // Run command and capture output

        bytes memory jsResult;
        try vm.ffi(runJsInputs) returns (bytes memory result) {
            jsResult = result;
        } catch {
            revert("JavaScript execution failed");
        }

        bytes memory expectedSignature = signReceipt(receipt.asMini(), signer);
        assertEq(expectedSignature, jsResult);
    }

    function test_miniReceiptSign_viem() public {
        string[] memory runJsInputs = new string[](12);

        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = JS_RECEIPT_SIGN_VIEM_PATH;
        runJsInputs[2] = "--mini";
        runJsInputs[3] = Strings.toHexString(uint256(miniReceiptCommon.to), 32);
        runJsInputs[4] = Strings.toHexString(uint256(miniReceiptCommon.tokenAddressTo), 32);
        runJsInputs[5] = Strings.toHexString(miniReceiptCommon.amountTo, 32);
        runJsInputs[6] = Strings.toHexString(miniReceiptCommon.chainFrom, 32);
        runJsInputs[7] = Strings.toHexString(miniReceiptCommon.chainTo, 32);
        runJsInputs[8] = Strings.toHexString(miniReceiptCommon.eventId, 32);
        runJsInputs[9] = Strings.toHexString(miniReceiptCommon.flags, 32);
        runJsInputs[10] = iToHex(miniReceiptCommon.data);
        runJsInputs[11] = Strings.toHexString(commonSigner.PK, 32);

        // Run command and capture output

        bytes memory jsResult;
        try vm.ffi(runJsInputs) returns (bytes memory result) {
            jsResult = result;
        } catch {
            revert("JavaScript execution failed");
        }

        bytes memory expectedSignature = signReceipt(miniReceiptCommon, commonSigner);
        assertEq(expectedSignature, jsResult);
    }

    function test_fuzz_miniReceiptSign_viem(
        bytes32 to, // destination address (bytes32 because of cross-chain compatibility)
        bytes32 tokenAddressTo, // destination token address (bytes32 because of cross-chain compatibility)
        uint256 amountTo, // amount of tokens received
        uint256 chainFrom, // chain id of the source chain
        uint256 chainTo, // chain id of the destination chain
        uint256 eventId, // transaction number
        uint256 flags, // flags for receiver
        bytes memory data, // additional data of the transaction (eg. user nonce for Solana)
        string memory signerSeed // signer seed
    ) public {
        // Validate inputs
        require(data.length <= 1024, "Data too large");
        require(amountTo <= type(uint256).max, "Amount to overflow");

        (address psigner, uint256 psignerPk) = makeAddrAndKey(signerSeed);
        Signer memory signer = Signer(psigner, psignerPk);

        string[] memory runJsInputs = new string[](12);
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

        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = JS_RECEIPT_SIGN_VIEM_PATH;
        runJsInputs[2] = "--mini";
        runJsInputs[3] = Strings.toHexString(uint256(to), 32);
        runJsInputs[4] = Strings.toHexString(uint256(tokenAddressTo), 32);
        runJsInputs[5] = Strings.toHexString(amountTo, 32);
        runJsInputs[6] = Strings.toHexString(chainFrom, 32);
        runJsInputs[7] = Strings.toHexString(chainTo, 32);
        runJsInputs[8] = Strings.toHexString(eventId, 32);
        runJsInputs[9] = Strings.toHexString(flags, 32);
        runJsInputs[10] = iToHex(data);
        runJsInputs[11] = Strings.toHexString(signer.PK, 32);

        bytes memory jsResult;
        try vm.ffi(runJsInputs) returns (bytes memory result) {
            jsResult = result;
        } catch {
            revert("JavaScript execution failed");
        }

        bytes memory expectedSignature = signReceipt(receipt, signer);
        assertEq(expectedSignature, jsResult);
    }

}