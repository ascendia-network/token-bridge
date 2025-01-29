// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;

import
    "@openzeppelin/contracts-upgradeable/access/manager/AccessManagedUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../interface/IValidation.sol";
import "../interface/IValidatorV1.sol";

import "../utils/PayloadUtils.sol";
import "../utils/ReceiptUtils.sol";

contract ValidatorUpgradeable is
    IValidation,
    IValidatorV1,
    Initializable,
    AccessManagedUpgradeable
{

    using EnumerableSet for EnumerableSet.AddressSet;
    using ECDSA for bytes32;
    using ReceiptUtils for Receipt;
    using PayloadUtils for SendPayload;

    struct ValidatorStorage {
        EnumerableSet.AddressSet validators;
        address payloadSigner;
        uint256 feeValidityWindow;
    }

    bytes32 private constant VALIDATOR_STORAGE_POSITION =
        0xf44f62b48f788febe9286c9767b06db2bafdbe32f9720a2466ac3df5942cf200;

    function _getValidatorStorage()
        private
        pure
        returns (ValidatorStorage storage $)
    {
        assembly {
            $.slot := VALIDATOR_STORAGE_POSITION
        }
    }

    function __ValidatorUpgradeable_init(
        address authority_,
        address[] calldata validators_,
        address payloadSigner_,
        uint256 feeValidityWindow_
    )
        internal
        onlyInitializing
    {
        __AccessManaged_init(authority_);
        __ValidatorUpgradeable_init_unchained(
            validators_, payloadSigner_, feeValidityWindow_
        );
    }

    function __ValidatorUpgradeable_init_unchained(
        address[] calldata validators_,
        address payloadSigner_,
        uint256 feeValidityWindow_
    )
        internal
        onlyInitializing
    {
        ValidatorStorage storage $ = _getValidatorStorage();
        $.payloadSigner = payloadSigner_;
        $.feeValidityWindow = feeValidityWindow_;
        for (uint256 i = 0; i < validators_.length; i++) {
            $.validators.add(validators_[i]);
        }
    }

    /// @inheritdoc IValidatorV1
    function addValidator(address validator_)
        public
        override
        restricted
        returns (bool added)
    {
        ValidatorStorage storage $ = _getValidatorStorage();
        return $.validators.add(validator_);
    }

    /// @inheritdoc IValidatorV1
    function removeValidator(address validator_)
        public
        override
        restricted
        returns (bool removed)
    {
        ValidatorStorage storage $ = _getValidatorStorage();
        return $.validators.remove(validator_);
    }

    /// @inheritdoc IValidation
    function setPayloadSigner(address payloadSigner_)
        public
        override
        restricted
        returns (bool success)
    {
        ValidatorStorage storage $ = _getValidatorStorage();
        $.payloadSigner = payloadSigner_;
        return true;
    }

    /// @inheritdoc IValidation
    function setFeeValidityWindow(uint256 feeValidityWindow_)
        public
        override
        restricted
        returns (bool success)
    {
        ValidatorStorage storage $ = _getValidatorStorage();
        $.feeValidityWindow = feeValidityWindow_;
        return true;
    }

    /// @inheritdoc IValidation
    function payloadSigner() public view override returns (address) {
        ValidatorStorage storage $ = _getValidatorStorage();
        return $.payloadSigner;
    }

    /// @inheritdoc IValidation
    function feeValidityWindow() public view override returns (uint256) {
        ValidatorStorage storage $ = _getValidatorStorage();
        return $.feeValidityWindow;
    }

    /// @inheritdoc IValidation
    function validate(
        Receipt calldata receipt,
        bytes calldata combinedSignatures
    )
        public
        view
        override
        returns (bool isValid)
    {
        require(
            combinedSignatures.length % 65 == 0, "Invalid signature length"
        );
        uint256 numSignatures = combinedSignatures.length / 65;
        ValidatorStorage storage $ = _getValidatorStorage();
        require(
            numSignatures == $.validators.length(), "Signature count mismatch"
        );
        bytes32 hash = receipt.toHash();
        for (uint256 i = 0; i < numSignatures; i++) {
            bytes memory signature = new bytes(65);
            for (uint256 j = 0; j < 65; j++) {
                signature[j] = combinedSignatures[i * 65 + j];
            }
            address signer = hash.recover(signature);
            require($.validators.contains(signer), "Invalid signature");
        }
        return true;
    }

    /// @inheritdoc IValidation
    function validatePayload(
        SendPayload calldata payload,
        bytes calldata signature
    )
        public
        view
        override
        returns (bool isValid)
    {
        ValidatorStorage storage $ = _getValidatorStorage();
        bytes32 hash = payload.toHash();
        address signer = hash.recover(signature);
        return signer == $.payloadSigner;
    }

}
