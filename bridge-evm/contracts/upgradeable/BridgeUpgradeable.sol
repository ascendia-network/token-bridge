// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import
    "@openzeppelin/contracts-upgradeable/access/manager/AccessManagedUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interface/IBridge.sol";
import "../interface/IValidation.sol";

import "../utils/AddressUtils.sol";
import "../utils/NoncesUpgradeable.sol";
import "../utils/ReceiptUtils.sol";

import "./TokenManagerUpgradeable.sol";

abstract contract BridgeUpgradeable is
    IBridge,
    Initializable,
    AccessManagedUpgradeable,
    NoncesUpgradeable,
    TokenManagerUpgradeable
{

    using AddressUtils for bytes32;
    using ReceiptUtils for Receipt;
    using SafeCast for uint256;
    /// @custom:storage-location erc7201:airdao.bridge.main.storage

    struct BridgeStorage {
        uint256 nativeSendAmount;
        address payable feeReceiver;
        IValidation validator;
        mapping(bytes32 => bool) claimed;
    }

    // keccak256(abi.encode(uint256(keccak256("airdao.bridge.main.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant BridgeStorageLocation =
        0x2025cb7006a1cd2283e3d168c03ae6ed5331b2b169fbf566938a066036efbf00;

    function _getBridgeStorage()
        private
        pure
        returns (BridgeStorage storage $)
    {
        assembly {
            $.slot := BridgeStorageLocation
        }
    }

    function __Bridge_init(
        address authority_,
        address SAMB_,
        IValidation validator_,
        address payable feeReceiver_,
        uint256 nativeSendAmount_
    )
        internal
        onlyInitializing
    {
        __AccessManaged_init(authority_);
        __Nonces_init();
        __TokenManager_init(address(this), SAMB_);
        __Bridge_init_unchained(validator_, feeReceiver_, nativeSendAmount_);
    }

    function __Bridge_init_unchained(
        IValidation validator_,
        address payable feeReceiver_,
        uint256 nativeSendAmount_
    )
        internal
        onlyInitializing
    {
        BridgeStorage storage $ = _getBridgeStorage();
        $.validator = validator_;
        $.feeReceiver = feeReceiver_;
        $.nativeSendAmount = nativeSendAmount_;
    }

    // restricted functions

    /// @inheritdoc IBridge
    function setFeeReceiver(address payable newFeeReceiver)
        public
        override
        restricted
    {
        _getBridgeStorage().feeReceiver = newFeeReceiver;
    }

    /// @inheritdoc IBridge
    function setNativeSendAmount(uint256 amount) public override restricted {
        _getBridgeStorage().nativeSendAmount = amount;
    }

    /// @inheritdoc IBridge
    function setValidator(IValidation newValidator)
        public
        override
        restricted
    {
        _getBridgeStorage().validator = newValidator;
    }

    /// @inheritdoc ITokenManager
    function addToken(
        address token,
        bytes32 externalTokenAddress
    )
        external
        virtual
        override
        returns (bool success)
    {
        return addToken(token, externalTokenAddress, true);
    }

    /// @inheritdoc ITokenManager
    function mapExternalToken(
        bytes32 externalTokenAddress,
        address token
    )
        public
        override
        restricted
        returns (bool success)
    {
        return super.mapExternalToken(externalTokenAddress, token);
    }

    /// @inheritdoc ITokenManager
    function unmapExternalToken(bytes32 externalTokenAddress)
        public
        override
        restricted
        returns (bool success)
    {
        return super.unmapExternalToken(externalTokenAddress);
    }

    /// @inheritdoc ITokenManager
    function addToken(
        address token,
        bytes32 externalTokenAddress,
        bool paused
    )
        public
        override
        restricted
        returns (bool success)
    {
        return super.addToken(token, externalTokenAddress, paused);
    }

    /// @inheritdoc ITokenManager
    function pauseToken(address token)
        public
        virtual
        override
        returns (bool success)
    {
        return super.pauseToken(token);
    }

    /// @inheritdoc ITokenManager
    function unpauseToken(address token)
        public
        override
        restricted
        returns (bool success)
    {
        return super.unpauseToken(token);
    }

    /// @inheritdoc ITokenManager
    function removeToken(
        address token,
        bytes32 externalTokenAddress
    )
        public
        override
        restricted
        returns (bool success)
    {
        return super.removeToken(token, externalTokenAddress);
    }

    /// @inheritdoc ITokenManager
    function deployExternalTokenERC20(
        bytes32 externalTokenAddress,
        string calldata name,
        string calldata symbol,
        uint8 decimals
    )
        public
        override
        restricted
        returns (address token)
    {
        return super.deployExternalTokenERC20(
            externalTokenAddress, name, symbol, decimals
        );
    }

    // view functions

    /// @inheritdoc IBridge
    function feeReceiver()
        public
        view
        override
        returns (address payable feeReceiver_)
    {
        return _getBridgeStorage().feeReceiver;
    }

    /// @inheritdoc IBridge
    function nativeSendAmount()
        public
        view
        override
        returns (uint256 nativeSendAmount_)
    {
        return _getBridgeStorage().nativeSendAmount;
    }

    /// Fee validity window from the validator
    /// @return validityWindow fee validity window
    function feeValidityWindow() public view returns (uint256 validityWindow) {
        return validator().feeValidityWindow();
    }

    /// @inheritdoc IBridge
    function validator() public view returns (IValidation) {
        return _getBridgeStorage().validator;
    }

    /// @inheritdoc IBridge
    function lastEventID() external view override returns (uint256 nonce) {
        return nonces(address(this));
    }

    /// @inheritdoc IBridge
    function isClaimed(Receipt calldata receipt)
        public
        view
        override
        returns (bool claimed)
    {
        return _getBridgeStorage().claimed[receipt.toHash()];
    }

    /// @inheritdoc IBridge
    function isClaimed(bytes32 receiptHash)
        public
        view
        override
        returns (bool claimed)
    {
        return _getBridgeStorage().claimed[receiptHash];
    }

    // internal functions

    //  -- guards

    /// Guard for validate the send values
    /// @param chainTo destination chain id
    /// @param payload send payload
    /// @param payloadSignature signature of the payload
    function _validateSendValues(
        uint256 chainTo,
        SendPayload calldata payload,
        bytes calldata payloadSignature
    )
        private
        view
    {
        require(
            validator().validatePayload(payload, payloadSignature),
            "Invalid payload signature"
        );
        require(payload.amountToSend > 0, "Invalid amount");
        require(chainTo != block.chainid, "Invalid destination chain");
        require(
            !pausedTokens(payload.tokenAddress.toAddress()), "Token is paused"
        );
    }

    /// Validate the claim values
    /// @param receipt receipt data
    /// @param signature signature of the receipt
    function _validateClaim(
        Receipt calldata receipt,
        bytes calldata signature
    )
        private
        view
    {
        require(!isClaimed(receipt), "Receipt is claimed already");
        require(validator().validate(receipt, signature), "Invalid signature");
        require(receipt.chainTo == block.chainid, "Invalid destination chain");
    }

    // -- savers
    /// Mark the receipt as claimed
    /// @param receipt receipt data
    function _markClaimed(Receipt calldata receipt) private {
        _getBridgeStorage().claimed[receipt.toHash()] = true;
    }

    // -- transfers
    /// Manages the transfer of the token to the bridge
    /// @param sender address of the sender
    /// @param token address of the token
    /// @param amount amount of tokens to send
    /// @param payload send payload
    function _transferTokenToBridge(
        address sender,
        address token,
        uint256 amount,
        SendPayload calldata payload
    )
        internal
    {
        if (token == address(0)) {
            require(
                payload.feeAmount + payload.amountToSend == msg.value,
                "Invalid value amount sent"
            );
        } else {
            require(payload.feeAmount == msg.value, "Invalid fee amount");
            bool received =
                IERC20(token).transferFrom(sender, address(this), amount);
            require(received, "Transfer failed");
        }
    }

    /// Send the fee to the fee receiver
    /// @param amount amount of native currency to send as fee
    function _sendFee(uint256 amount) internal {
        (bool sent,) = feeReceiver().call{value: amount}("");
        require(sent, "Native send failed");
    }

    /// Transfer the claimed token to the receiver
    /// @param flags flags of the claim
    /// @param token address of the token
    /// @param amount amount of tokens to send
    /// @param receiver address of the receiver
    function _transferClaim(
        uint256 flags,
        address token,
        uint256 amount,
        address receiver
    )
        private
    {
        require(token != address(0), "Unknown token address");
        require(!pausedTokens(token), "Token is paused");
        bool unlocked = false;
        if (token == samb() && flags & BridgeFlags.SHOULD_UNWRAP == 0) {
            (unlocked,) = payable(receiver).call{value: amount}("");
        } else {
            if (token == samb() && flags & BridgeFlags.SHOULD_UNWRAP != 0) {
                _wrap(amount);
            }
            unlocked =
                IERC20(token).transferFrom(address(this), receiver, amount);
        }
        require(unlocked, "Transfer failed");
        BridgeStorage storage $ = _getBridgeStorage();
        if (flags & BridgeFlags.SEND_NATIVE_TO_RECEIVER != 0) {
            (bool sent,) = payable(receiver).call{value: $.nativeSendAmount}("");
            require(sent, "Native send failed");
        }
    }

    // -- common internals

    /// Perform the send operation (receive tokens and save receipt)
    /// @param recipient address of the recipient on the other chain
    /// @param chainTo destination chain id
    /// @param payload send payload
    /// @param payloadSignature signature of the payload
    function _send(
        bytes32 recipient,
        uint256 chainTo,
        SendPayload calldata payload,
        bytes calldata payloadSignature
    )
        internal
        returns (Receipt memory receipt)
    {
        _validateSendValues(chainTo, payload, payloadSignature);
        address sender = payload.flags & BridgeFlags.SENDER_IS_TXORIGIN != 0
            ? tx.origin
            : msg.sender;
        _transferTokenToBridge(
            sender,
            payload.tokenAddress.toAddress(),
            payload.amountToSend,
            payload
        );
        Receipt memory _receipt = Receipt({
            from: bytes32(uint256(uint160(msg.sender))),
            to: recipient,
            tokenAddress: payload.tokenAddress,
            amount: payload.amountToSend,
            chainFrom: block.chainid,
            chainTo: chainTo,
            eventId: _useNonce(address(this)),
            flags: payload.flags >> 64, // remove sender flags
            data: abi.encodePacked(_useNonce(recipient).toUint64())
        });
        _sendFee(payload.feeAmount);
        emit TokenLocked(_receipt);
        return _receipt;
    }

    // user functions

    /// @inheritdoc IBridge
    function send(
        bytes32 recipient,
        uint256 chainTo,
        SendPayload calldata payload,
        bytes calldata payloadSignature
    )
        external
        payable
        override
        returns (Receipt memory receipt)
    {
        return _send(recipient, chainTo, payload, payloadSignature);
    }

    /// @inheritdoc IBridge
    function send(
        bytes32 recipient,
        uint256 chainTo,
        SendPayload calldata payload,
        bytes calldata payloadSignature,
        uint256 _deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
        external
        payable
        override
        returns (Receipt memory receipt)
    {
        address tokenAddress = payload.tokenAddress.toAddress();
        if (tokenAddress != address(0)) {
            if (payload.flags & BridgeFlags.SEND_WITH_PERMIT != 0) {
                IERC20Permit(tokenAddress).permit(
                    msg.sender,
                    address(this),
                    payload.amountToSend,
                    _deadline,
                    v,
                    r,
                    s
                );
            } else {
                revert("Invalid permit flag");
            }
        }
        return _send(recipient, chainTo, payload, payloadSignature);
    }

    /// @inheritdoc IBridge
    function claim(
        Receipt calldata receipt,
        bytes calldata signature
    )
        external
        override
        returns (bool success)
    {
        _validateClaim(receipt, signature);
        address token = external2token(receipt.tokenAddress);
        uint256 receivedFlags = receipt.flags << 64; // restore flags position
        address receiver = receipt.to.toAddress();
        _transferClaim(receivedFlags, token, receipt.amount, receiver);
        _markClaimed(receipt);
        emit TokenUnlocked(receipt);
        return true;
    }

}
