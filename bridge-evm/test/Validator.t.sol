// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {
    UnsafeUpgrades,
    Upgrades
} from "openzeppelin-foundry-upgrades/Upgrades.sol";

import {Initializable} from
    "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessManager} from
    "@openzeppelin/contracts/access/manager/AccessManager.sol";
import {IAccessManaged} from
    "@openzeppelin/contracts/access/manager/IAccessManaged.sol";

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EnumerableSet} from
    "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {IBridgeTypes} from "../contracts/interface/IBridgeTypes.sol";
import {IValidation} from "../contracts/interface/IValidation.sol";
import {IValidatorV1} from "../contracts/interface/IValidatorV1.sol";
import {IWrapped} from "../contracts/interface/IWrapped.sol";

import {PayloadUtils} from "../contracts/utils/PayloadUtils.sol";
import {ReceiptUtils} from "../contracts/utils/ReceiptUtils.sol";

import {Validator} from "../contracts/Validator.sol";

import {sAMB} from "./mocks/sAMB.sol";

contract ValidatorTest is Test {

    using EnumerableSet for EnumerableSet.AddressSet;
    using ReceiptUtils for IBridgeTypes.Receipt;
    using PayloadUtils for IBridgeTypes.SendPayload;

    bytes32 private constant coverageProfile =
        keccak256(abi.encodePacked("coverage"));

    function isCoverage() internal view returns (bool) {
        return keccak256(
            abi.encodePacked(vm.envOr("FOUNDRY_PROFILE", string("default")))
        ) == coverageProfile;
    }

    AccessManager private authority;
    Validator private validatorInstance;
    IWrapped private wrappedToken;

    address alice = address(0xA11ce);
    address bob = address(0xB0b);
    address chris = address(0xC14);
    address deadBeef = address(0xDeadBeef);
    address payable fee = payable(address(0xFee));
    EnumerableSet.AddressSet validatorSet;

    function setUpWrappedToken() public virtual returns (IWrapped) {
        address wrappedTokenAddress = address(new sAMB("Wrapped Amber", "sAMB"));
        wrappedToken = IWrapped(wrappedTokenAddress);
        return wrappedToken;
    }

    function setUpValidator(
        address authorityAddress,
        address[] memory validators,
        address payloadSigner,
        uint256 feeValidityWindow
    )
        public
        virtual
        returns (Validator)
    {
        address proxy;
        if (isCoverage()) {
            address validator = address(new Validator());
            proxy = address(
                UnsafeUpgrades.deployUUPSProxy(
                    validator,
                    abi.encodeCall(
                        Validator.initialize,
                        (
                            authorityAddress,
                            validators,
                            payloadSigner,
                            feeValidityWindow
                        )
                    )
                )
            );
        } else {
            proxy = address(
                Upgrades.deployUUPSProxy(
                    "Validator.sol",
                    abi.encodeCall(
                        Validator.initialize,
                        (
                            authorityAddress,
                            validators,
                            payloadSigner,
                            feeValidityWindow
                        )
                    )
                )
            );
        }
        validatorInstance = Validator(proxy);
        return validatorInstance;
    }

    function setUp() public {
        authority = new AccessManager(address(this));
        validatorSet.add(alice);

        setUpWrappedToken();
        setUpValidator(address(authority), validatorSet.values(), deadBeef, 100);
    }

    function test_addValidator() public {
        address newValidator = address(0xD0D0);
        assertTrue(validatorInstance.addValidator(newValidator));
        assertTrue(validatorInstance.isValidator(newValidator));
    }

    function test_addValidator_alreadyValidator() public {
        address newValidator = address(0xD0D0);
        assertTrue(validatorInstance.addValidator(newValidator));
        assertTrue(validatorInstance.isValidator(newValidator));
        assertFalse(validatorInstance.addValidator(newValidator));
        assertTrue(validatorInstance.isValidator(newValidator));
    }

    function test_fuzz_addValidator(address newValidator) public {
        vm.assume(newValidator != address(0) && newValidator != alice);
        assertTrue(validatorInstance.addValidator(newValidator));
        assertTrue(validatorInstance.isValidator(newValidator));
    }

    function test_revertIf_addValidator_zero_address() public {
        address newValidator = address(0xD0D0);
        assertTrue(validatorInstance.addValidator(newValidator));
        assertFalse(validatorInstance.addValidator(address(0)));
    }

    function test_revertIf_addValidator_not_authority() public {
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        address newValidator = address(0xD0D0);
        validatorInstance.addValidator(newValidator);
        vm.stopPrank();
    }

    function test_removeValidator() public {
        assertTrue(validatorInstance.removeValidator(alice));
        assertFalse(validatorInstance.isValidator(alice));
    }

    function test_removeValidator_notValidator() public {
        assertFalse(validatorInstance.isValidator(deadBeef));
        assertFalse(validatorInstance.removeValidator(deadBeef));
        assertFalse(validatorInstance.isValidator(deadBeef));
    }

    function test_revertIf_removeValidator_not_authority() public {
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        validatorInstance.removeValidator(alice);
        vm.stopPrank();
    }

    function test_isValidator() public view {
        assertTrue(validatorInstance.isValidator(alice));
        assertFalse(validatorInstance.isValidator(deadBeef));
    }

    function test_setPayloadSigner() public {
        validatorInstance.setPayloadSigner(alice);
        assertEq(validatorInstance.payloadSigner(), alice);
    }

    function test_revertIf_setPayloadSigner_not_authority() public {
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        validatorInstance.setPayloadSigner(alice);
        vm.stopPrank();
    }

    function test_setFeeValidityWindow() public {
        validatorInstance.setFeeValidityWindow(300);
        assertEq(validatorInstance.feeValidityWindow(), 300);
    }

    function test_revertIf_setFeeValidityWindow_not_authority() public {
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        validatorInstance.setFeeValidityWindow(100);
        vm.stopPrank();
    }

    function test_validatePayload() public {
        (address signer, uint256 signerPk) = makeAddrAndKey("signer");
        validatorInstance.setPayloadSigner(signer);
        IBridgeTypes.SendPayload memory payload = IBridgeTypes.SendPayload({
            tokenAddress: bytes32("SOLANA"),
            amountToSend: 100 ether,
            feeAmount: 1 ether,
            timestamp: block.timestamp,
            flags: 0,
            flagData: bytes("SOME_USEFUL_DATA")
        });
        vm.startPrank(signer);
        bytes32 digest = payload.toHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v); // note the order here is different from line above.
        vm.stopPrank();
        assertTrue(
            validatorInstance.validatePayload(payload, signature),
            "Payload validation failed"
        );
    }

    function test_revertIf_validatePayload_invalid_signature() public {
        (address signer, uint256 signerPk) = makeAddrAndKey("signer");
        IBridgeTypes.SendPayload memory payload = IBridgeTypes.SendPayload({
            tokenAddress: bytes32("SOLANA"),
            amountToSend: 100 ether,
            feeAmount: 1 ether,
            timestamp: block.timestamp,
            flags: 0,
            flagData: bytes("SOME_USEFUL_DATA")
        });
        vm.startPrank(signer);
        bytes32 digest = payload.toHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(v, r, s); // note the order here is different from line above.
        vm.stopPrank();
        // Unpack back values from signature (but in correct order)
        assembly ("memory-safe") {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }
        vm.expectRevert(
            abi.encodeWithSelector(ECDSA.ECDSAInvalidSignatureS.selector, s)
        );
        validatorInstance.validatePayload(payload, signature);
    }

    function test_revertWhen_validatePayload_UnknownSigner() public {
        (address signer, uint256 signerPk) = makeAddrAndKey("signer");
        IBridgeTypes.SendPayload memory payload = IBridgeTypes.SendPayload({
            tokenAddress: bytes32("SOLANA"),
            amountToSend: 100 ether,
            feeAmount: 1 ether,
            timestamp: block.timestamp,
            flags: 0,
            flagData: bytes("SOME_USEFUL_DATA")
        });
        vm.startPrank(signer);
        bytes32 digest = payload.toHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v); // note the order here is different from line above.
        vm.stopPrank();
        vm.startPrank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IValidation.UnknownSigner.selector, signer)
        );
        validatorInstance.validatePayload(payload, signature);
        vm.stopPrank();
    }

    function beforeTestSetup(bytes4 testSelector)
        public
        pure
        returns (bytes[] memory beforeTestCalldata)
    {
        if (
            testSelector == this.test_validate.selector
                || testSelector
                    == this.test_revertWhen_validate_InvalidSignatureLength.selector
        ) {
            beforeTestCalldata = new bytes[](1);
            beforeTestCalldata[0] =
                abi.encode(this.clearPredefinedValidators.selector);
        }
    }

    function clearPredefinedValidators() public {
        while (validatorSet.length() > 0) {
            validatorInstance.removeValidator(validatorSet.at(0));
            validatorSet.remove(validatorSet.at(0));
        }
    }

    function test_validate() public {
        string[] memory signers = new string[](5);
        signers[0] = "alice";
        signers[1] = "bob";
        signers[2] = "chris";
        signers[3] = "dave";
        signers[4] = "fred";
        uint256 signersNumber = signers.length;

        bytes memory signature;

        IBridgeTypes.Receipt memory receipt = IBridgeTypes.Receipt({
            from: bytes32("GOOD_SENDER"),
            to: bytes32("GOOD_RECEIVER"),
            tokenAddress: bytes32("SOLANA"),
            amount: 100 ether,
            chainFrom: 1,
            chainTo: 2,
            eventId: 1,
            flags: 0,
            data: bytes("SOME_USEFUL_DATA")
        });
        bytes32 digest = receipt.toHash();
        for (uint256 i = 0; i < signersNumber; i++) {
            (address signer, uint256 signerPk) = makeAddrAndKey(signers[i]);
            validatorInstance.addValidator(signer);
            vm.startPrank(signer);
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
            bytes memory signerSignature = abi.encodePacked(r, s, v); // note the order here is different from line above.
            signature = bytes.concat(signature, signerSignature);
            vm.stopPrank();
        }
        assertTrue(
            validatorInstance.validate(receipt, signature),
            "Receipt validation failed"
        );
    }

    function test_revertWhen_validate_UnknownSigner() public {
        string[] memory signers = new string[](5);
        signers[0] = "alice";
        signers[1] = "bob";
        signers[2] = "chris";
        signers[3] = "dave";
        signers[4] = "fred";
        uint256 signersNumber = signers.length;

        bytes memory signature;

        IBridgeTypes.Receipt memory receipt = IBridgeTypes.Receipt({
            from: bytes32("GOOD_SENDER"),
            to: bytes32("GOOD_RECEIVER"),
            tokenAddress: bytes32("SOLANA"),
            amount: 100 ether,
            chainFrom: 1,
            chainTo: 2,
            eventId: 1,
            flags: 0,
            data: bytes("SOME_USEFUL_DATA")
        });
        address unknownSignerAddress;
        for (uint256 i = 0; i < signersNumber; i++) {
            (address signer, uint256 signerPk) = makeAddrAndKey(signers[i]);
            if (i != 0) {
                // We don't add the first signer to the validator set
                // to simulate an unknown signer
                // P.S. another alice is already in the validator set
                validatorInstance.addValidator(signer);
            } else {
                unknownSignerAddress = signer;
            }
            vm.startPrank(signer);
            bytes32 digest = receipt.toHash();
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
            bytes memory signerSignature = abi.encodePacked(r, s, v); // note the order here is different from line above.
            signature = bytes.concat(signature, signerSignature);
            vm.stopPrank();
        }

        vm.expectRevert(
            abi.encodeWithSelector(
                IValidation.UnknownSigner.selector, unknownSignerAddress
            )
        );
        validatorInstance.validate(receipt, signature);
    }

    function test_revertWhen_validate_SignatureCountMismatch() public {
        string[] memory signers = new string[](5);
        signers[0] = "alice";
        signers[1] = "bob";
        signers[2] = "chris";
        signers[3] = "dave";
        signers[4] = "fred";
        uint256 signersNumber = signers.length;

        bytes memory signature;

        IBridgeTypes.Receipt memory receipt = IBridgeTypes.Receipt({
            from: bytes32("GOOD_SENDER"),
            to: bytes32("GOOD_RECEIVER"),
            tokenAddress: bytes32("SOLANA"),
            amount: 100 ether,
            chainFrom: 1,
            chainTo: 2,
            eventId: 1,
            flags: 0,
            data: bytes("SOME_USEFUL_DATA")
        });

        for (uint256 i = 0; i < signersNumber; i++) {
            (address signer, uint256 signerPk) = makeAddrAndKey(signers[i]);
            validatorInstance.addValidator(signer);
            vm.startPrank(signer);
            bytes32 digest = receipt.toHash();
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
            bytes memory signerSignature = abi.encodePacked(r, s, v); // note the order here is different from line above.
            signature = bytes.concat(signature, signerSignature);
            vm.stopPrank();
        }
        // Another alice in the validator set, so the signature count is different
        vm.expectRevert(
            abi.encodeWithSelector(
                IValidatorV1.SignatureCountMismatch.selector,
                signersNumber,
                signersNumber + 1
            )
        );
        validatorInstance.validate(receipt, signature);
    }

    function test_revertWhen_validate_InvalidSignatureLength() public {
        string[] memory signers = new string[](5);
        signers[0] = "alice";
        signers[1] = "bob";
        signers[2] = "chris";
        signers[3] = "dave";
        signers[4] = "fred";
        uint256 signersNumber = signers.length;

        bytes memory signature;

        IBridgeTypes.Receipt memory receipt = IBridgeTypes.Receipt({
            from: bytes32("GOOD_SENDER"),
            to: bytes32("GOOD_RECEIVER"),
            tokenAddress: bytes32("SOLANA"),
            amount: 100 ether,
            chainFrom: 1,
            chainTo: 2,
            eventId: 1,
            flags: 0,
            data: bytes("SOME_USEFUL_DATA")
        });

        for (uint256 i = 0; i < signersNumber; i++) {
            (address signer, uint256 signerPk) = makeAddrAndKey(signers[i]);
            validatorInstance.addValidator(signer);
            vm.startPrank(signer);
            bytes32 digest = receipt.toHash();
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
            bytes memory signerSignature = abi.encodePacked(r, s, v); // note the order here is different from line above.
            signature = bytes.concat(signature, signerSignature);
            vm.stopPrank();
        }
        // Change the signature length to simulate an invalid signature
        signature = bytes.concat(signature, bytes("GARBAGE"));
        vm.expectRevert(
            abi.encodeWithSelector(
                IValidatorV1.InvalidSignatureLength.selector, signature.length
            )
        );
        validatorInstance.validate(receipt, signature);
    }

}
