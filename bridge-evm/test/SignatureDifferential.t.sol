// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {BridgeTypes} from "../contracts/interface/BridgeTypes.sol";
import {PayloadUtils} from "../contracts/utils/PayloadUtils.sol";
import {ReceiptUtils} from "../contracts/utils/ReceiptUtils.sol";

contract SignatureDifferentialTest is Test {
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

        commonSigner = getSigner("commonSigner");
    }

    function iToHex(bytes memory buffer) public pure returns (string memory) {
        // Fixed buffer size for hexadecimal conversion
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

    string constant JS_RECEIPT_SIGN_ETHERS_PATH =
        "./test/differential_testing/signReceiptEthers.js";

    function runFullReceiptJS(
        string memory jsPath,
        BridgeTypes.FullReceipt memory receipt,
        Signer memory signer
    ) internal returns (bytes memory jsResult) {
        string[] memory runJsInputs = new string[](15);
        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = jsPath;
        runJsInputs[2] = "--full";
        runJsInputs[3] = Strings.toHexString(uint256(receipt.from), 32);
        runJsInputs[4] = Strings.toHexString(uint256(receipt.to), 32);
        runJsInputs[5] = Strings.toHexString(
            uint256(receipt.tokenAddressFrom),
            32
        );
        runJsInputs[6] = Strings.toHexString(
            uint256(receipt.tokenAddressTo),
            32
        );
        runJsInputs[7] = Strings.toHexString(receipt.amountFrom, 32);
        runJsInputs[8] = Strings.toHexString(receipt.amountTo, 32);
        runJsInputs[9] = Strings.toHexString(receipt.chainFrom, 32);
        runJsInputs[10] = Strings.toHexString(receipt.chainTo, 32);
        runJsInputs[11] = Strings.toHexString(receipt.eventId, 32);
        runJsInputs[12] = Strings.toHexString(receipt.flags, 32);
        runJsInputs[13] = iToHex(receipt.data);
        runJsInputs[14] = Strings.toHexString(signer.PK, 32);
        // Run command and capture output
        return vm.ffi(runJsInputs);
    }

    function runMiniReceiptJS(
        string memory jsPath,
        BridgeTypes.MiniReceipt memory receipt,
        Signer memory signer
    ) internal returns (bytes memory jsResult) {
        string[] memory runJsInputs = new string[](12);
        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = jsPath;
        runJsInputs[2] = "--mini";
        runJsInputs[3] = Strings.toHexString(uint256(receipt.to), 32);
        runJsInputs[4] = Strings.toHexString(
            uint256(receipt.tokenAddressTo),
            32
        );
        runJsInputs[5] = Strings.toHexString(receipt.amountTo, 32);
        runJsInputs[6] = Strings.toHexString(receipt.chainFrom, 32);
        runJsInputs[7] = Strings.toHexString(receipt.chainTo, 32);
        runJsInputs[8] = Strings.toHexString(receipt.eventId, 32);
        runJsInputs[9] = Strings.toHexString(receipt.flags, 32);
        runJsInputs[10] = iToHex(receipt.data);
        runJsInputs[11] = Strings.toHexString(signer.PK, 32);
        // Run command and capture output
        return vm.ffi(runJsInputs);
    }

    function runPayloadJS(
        string memory jsPath,
        BridgeTypes.SendPayload memory payload,
        Signer memory signer
    ) internal returns (bytes memory jsResult) {
        string[] memory runJsInputs = new string[](11);
        // Build ffi command string
        runJsInputs[0] = "node";
        runJsInputs[1] = jsPath;
        runJsInputs[2] = Strings.toHexString(uint256(payload.destChainId), 32);
        runJsInputs[3] = Strings.toHexString(uint256(payload.tokenAddress), 32);
        runJsInputs[4] = Strings.toHexString(
            uint256(payload.externalTokenAddress),
            32
        );
        runJsInputs[5] = Strings.toHexString(payload.amountToSend, 32);
        runJsInputs[6] = Strings.toHexString(payload.feeAmount, 32);
        runJsInputs[7] = Strings.toHexString(payload.timestamp, 32);
        runJsInputs[8] = Strings.toHexString(payload.flags, 32);
        runJsInputs[9] = iToHex(payload.flagData);
        runJsInputs[10] = Strings.toHexString(signer.PK, 32);
        // Run command and capture output
        return vm.ffi(runJsInputs);
    }

    function fullReceiptCheck(
        string memory jsPath,
        BridgeTypes.FullReceipt memory receipt,
        Signer memory signer
    ) internal {
        bytes memory jsResult = runFullReceiptJS(jsPath, receipt, signer);
        bytes memory expectedSignature = signReceipt(receipt.asMini(), signer);
        assertEq(expectedSignature, jsResult);
    }

    function miniReceiptCheck(
        string memory jsPath,
        BridgeTypes.MiniReceipt memory receipt,
        Signer memory signer
    ) internal {
        bytes memory jsResult = runMiniReceiptJS(jsPath, receipt, signer);
        bytes memory expectedSignature = signReceipt(receipt, signer);
        assertEq(expectedSignature, jsResult);
    }

    function payloadCheck(
        string memory jsPath,
        BridgeTypes.SendPayload memory payload,
        Signer memory signer
    ) internal {
        bytes memory jsResult = runPayloadJS(jsPath, payload, signer);
        bytes memory expectedSignature = signPayload(payload, signer);
        assertEq(expectedSignature, jsResult);
    }

    function buildFullReceipt(
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
        bytes calldata data // additional data of the transaction (eg. user nonce for Solana)
    ) internal pure returns (BridgeTypes.FullReceipt memory) {
        return
            BridgeTypes.FullReceipt({
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
    }

    function buildMiniReceipt(
        bytes32 to, // destination address (bytes32 because of cross-chain compatibility)
        bytes32 tokenAddressTo, // destination token address (bytes32 because of cross-chain compatibility)
        uint256 amountTo, // amount of tokens received
        uint256 chainFrom, // chain id of the source chain
        uint256 chainTo, // chain id of the destination chain
        uint256 eventId, // transaction number
        uint256 flags, // flags for receiver
        bytes calldata data // additional data of the transaction (eg. user nonce for Solana)
    ) internal pure returns (BridgeTypes.MiniReceipt memory) {
        return
            BridgeTypes.MiniReceipt({
                to: to,
                tokenAddressTo: tokenAddressTo,
                amountTo: amountTo,
                chainFrom: chainFrom,
                chainTo: chainTo,
                eventId: eventId,
                flags: flags,
                data: data
            });
    }

    function buildPayload(
        uint256 destChainId, // destination chain id
        bytes32 tokenAddress, // address of the token contract
        bytes32 externalTokenAddress, // address of the external token contract
        uint256 amountToSend, // amount of the tokens to be sent
        uint256 feeAmount, // amount of the fee
        uint256 timestamp, // timestamp of the fee was generated
        uint256 flags, // flags of the sending operation
        bytes calldata flagData // additional data of the sending operation (unused for now)
    ) internal pure returns (BridgeTypes.SendPayload memory) {
        return
            BridgeTypes.SendPayload({
                destChainId: destChainId,
                tokenAddress: tokenAddress,
                externalTokenAddress: externalTokenAddress,
                amountToSend: amountToSend,
                feeAmount: feeAmount,
                timestamp: timestamp,
                flags: flags,
                flagData: flagData
            });
    }

    function getSigner(
        string memory signerSeed
    ) internal returns (Signer memory) {
        (address psigner, uint256 psignerPk) = makeAddrAndKey(signerSeed);
        return Signer(psigner, psignerPk);
    }

    function test_fullReceiptSign_ethers() public {
        fullReceiptCheck(
            JS_RECEIPT_SIGN_ETHERS_PATH,
            receiptCommon,
            commonSigner
        );
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
        bytes calldata data, // additional data of the transaction (eg. user nonce for Solana)
        string calldata signerSeed // signer seed
    ) public {
        fullReceiptCheck(
            JS_RECEIPT_SIGN_ETHERS_PATH,
            buildFullReceipt(
                from,
                to,
                tokenAddressFrom,
                tokenAddressTo,
                amountFrom,
                amountTo,
                chainFrom,
                chainTo,
                eventId,
                flags,
                data
            ),
            getSigner(signerSeed)
        );
    }

    function test_miniReceiptSign_ethers() public {
        miniReceiptCheck(
            JS_RECEIPT_SIGN_ETHERS_PATH,
            receiptCommon.asMini(),
            commonSigner
        );
    }

    function test_fuzz_miniReceiptSign_ethers(
        bytes32 to, // destination address (bytes32 because of cross-chain compatibility)
        bytes32 tokenAddressTo, // destination token address (bytes32 because of cross-chain compatibility)
        uint256 amountTo, // amount of tokens received
        uint256 chainFrom, // chain id of the source chain
        uint256 chainTo, // chain id of the destination chain
        uint256 eventId, // transaction number
        uint256 flags, // flags for receiver
        bytes calldata data, // additional data of the transaction (eg. user nonce for Solana)
        string calldata signerSeed // signer seed
    ) public {
        miniReceiptCheck(
            JS_RECEIPT_SIGN_ETHERS_PATH,
            buildMiniReceipt(
                to,
                tokenAddressTo,
                amountTo,
                chainFrom,
                chainTo,
                eventId,
                flags,
                data
            ),
            getSigner(signerSeed)
        );
    }

    string constant JS_RECEIPT_SIGN_VIEM_PATH =
        "./test/differential_testing/signReceiptViem.js";

    function test_fullReceiptSign_viem() public {
        fullReceiptCheck(
            JS_RECEIPT_SIGN_VIEM_PATH,
            receiptCommon,
            commonSigner
        );
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
        bytes calldata data, // additional data of the transaction (eg. user nonce for Solana)
        string calldata signerSeed // signer seed
    ) public {
        fullReceiptCheck(
            JS_RECEIPT_SIGN_VIEM_PATH,
            buildFullReceipt(
                from,
                to,
                tokenAddressFrom,
                tokenAddressTo,
                amountFrom,
                amountTo,
                chainFrom,
                chainTo,
                eventId,
                flags,
                data
            ),
            getSigner(signerSeed)
        );
    }

    function test_miniReceiptSign_viem() public {
        miniReceiptCheck(
            JS_RECEIPT_SIGN_VIEM_PATH,
            receiptCommon.asMini(),
            commonSigner
        );
    }

    function test_fuzz_miniReceiptSign_viem(
        bytes32 to, // destination address (bytes32 because of cross-chain compatibility)
        bytes32 tokenAddressTo, // destination token address (bytes32 because of cross-chain compatibility)
        uint256 amountTo, // amount of tokens received
        uint256 chainFrom, // chain id of the source chain
        uint256 chainTo, // chain id of the destination chain
        uint256 eventId, // transaction number
        uint256 flags, // flags for receiver
        bytes calldata data, // additional data of the transaction (eg. user nonce for Solana)
        string calldata signerSeed // signer seed
    ) public {
        miniReceiptCheck(
            JS_RECEIPT_SIGN_VIEM_PATH,
            buildMiniReceipt(
                to,
                tokenAddressTo,
                amountTo,
                chainFrom,
                chainTo,
                eventId,
                flags,
                data
            ),
            getSigner(signerSeed)
        );
    }

    string constant JS_PAYLOAD_SIGN_ETHERS_PATH =
        "./test/differential_testing/signPayloadEthers.js";

    function test_payloadSign_ethers() public {
        payloadCheck(JS_PAYLOAD_SIGN_ETHERS_PATH, payloadCommon, commonSigner);
    }

    function test_fuzz_payloadSign_ethers(
        uint256 destChainId, // destination chain id
        bytes32 tokenAddress, // address of the token contract
        bytes32 externalTokenAddress, // address of the external token contract
        uint256 amountToSend, // amount of the tokens to be sent
        uint256 feeAmount, // amount of the fee
        uint256 timestamp, // timestamp of the fee was generated
        uint256 flags, // flags of the sending operation
        bytes calldata flagData, // additional data of the sending operation (unused for now)
        string calldata signerSeed // signer seed
    ) public {
        payloadCheck(
            JS_PAYLOAD_SIGN_ETHERS_PATH,
            buildPayload(
                destChainId,
                tokenAddress,
                externalTokenAddress,
                amountToSend,
                feeAmount,
                timestamp,
                flags,
                flagData
            ),
            getSigner(signerSeed)
        );
    }

    string constant JS_PAYLOAD_SIGN_VIEM_PATH =
        "./test/differential_testing/signPayloadViem.js";

    function test_payloadSign_viem() public {
        payloadCheck(JS_PAYLOAD_SIGN_VIEM_PATH, payloadCommon, commonSigner);
    }

    function test_fuzz_payloadSign_viem(
        uint256 destChainId, // destination chain id
        bytes32 tokenAddress, // address of the token contract
        bytes32 externalTokenAddress, // address of the external token contract
        uint256 amountToSend, // amount of the tokens to be sent
        uint256 feeAmount, // amount of the fee
        uint256 timestamp, // timestamp of the fee was generated
        uint256 flags, // flags of the sending operation
        bytes calldata flagData, // additional data of the sending operation (unused for now)
        string calldata signerSeed // signer seed
    ) public {
        payloadCheck(
            JS_PAYLOAD_SIGN_VIEM_PATH,
            buildPayload(
                destChainId,
                tokenAddress,
                externalTokenAddress,
                amountToSend,
                feeAmount,
                timestamp,
                flags,
                flagData
            ),
            getSigner(signerSeed)
        );
    }
}
