// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "../interface/IBridge.sol";
import "../utils/AddressUtils.sol";
import "./TokenManagerUpgradeable.sol";

abstract contract BridgeUpgradeable is
    IBridge,
    Initializable,
    OwnableUpgradeable,
    NoncesUpgradeable,
    TokenManagerUpgradeable
{
    using AddressUtils for bytes32;
    /// @custom:storage-location erc7201:airdao.bridge.main.storage
    struct BridgeStorage {
        address MPCAddress;
        address feeSigner;
        address payable feeReceiver;
        uint256 feeValidityWindow;
        uint256 submissionWindow;
        mapping(bool => mapping(uint256 => Receipt)) receipts;
        mapping(bool => mapping(uint256 => ReceiptStatus)) receiptStatus;
        mapping(bool => mapping(uint256 => uint256)) receiptTimestamp;
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
        address owner_,
        address SAMB_,
        address MPCAddress_,
        address feeSigner_,
        address payable feeReceiver_,
        uint256 feeValidityWindow_,
        uint256 submissionWindow_
    ) internal onlyInitializing {
        __Ownable_init(owner_);
        __Nonces_init();
        __TokenManager_init(address(this), SAMB_);
        __Bridge_init_unchained(
            MPCAddress_,
            feeSigner_,
            feeReceiver_,
            feeValidityWindow_,
            submissionWindow_
        );
    }

    function __Bridge_init_unchained(
        address MPCAddress_,
        address feeSigner_,
        address payable feeReceiver_,
        uint256 feeValidityWindow_,
        uint256 submissionWindow_
    ) internal onlyInitializing {
        BridgeStorage storage $ = _getBridgeStorage();
        $.MPCAddress = MPCAddress_;
        $.feeSigner = feeSigner_;
        $.feeReceiver = feeReceiver_;
        $.feeValidityWindow = feeValidityWindow_;
        $.submissionWindow = submissionWindow_;
    }

    function MPCAddress() public view override returns (address mpcAddress) {
        return _getBridgeStorage().MPCAddress;
    }

    function setMPCAddress(address MPCAddress_) external override onlyOwner {
        _getBridgeStorage().MPCAddress = MPCAddress_;
    }

    function feeSigner() public view override returns (address FeeSigner) {
        return _getBridgeStorage().feeSigner;
    }

    function setFeeSigner(address feeSigner_) external override onlyOwner {
        _getBridgeStorage().feeSigner = feeSigner_;
    }

    function feeReceiver() public view returns (address payable) {
        return _getBridgeStorage().feeReceiver;
    }

    function setFeeReceiver(address payable feeReceiver_) external onlyOwner {
        _getBridgeStorage().feeReceiver = feeReceiver_;
    }

    function feeValidityWindow()
        public
        view
        override
        returns (uint256 validityWindow)
    {
        return _getBridgeStorage().feeValidityWindow;
    }

    function setFeeValidityWindow(
        uint256 feeValidityWindow_
    ) external onlyOwner {
        _getBridgeStorage().feeValidityWindow = feeValidityWindow_;
    }

    function submissionWindow() public view returns (uint256) {
        return _getBridgeStorage().submissionWindow;
    }

    function setSubmissionWindow(uint256 submissionWindow_) external onlyOwner {
        _getBridgeStorage().submissionWindow = submissionWindow_;
    }

    function isValidFee(
        Fee calldata fee,
        bytes calldata signature
    ) public view override returns (bool) {
        require(
            block.timestamp - fee.timestamp <= feeValidityWindow(),
            "Fee expired"
        );
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                fee.tokenAddress,
                fee.amountToSend,
                fee.amount,
                fee.timestamp
            )
        );
        return
            SignatureChecker.isValidSignatureNow(
                feeSigner(),
                messageHash,
                signature
            );
    }

    function lastNonce() external view override returns (uint256) {
        return nonces(address(this));
    }

    function getReceipt(
        uint256 nonce,
        bool isOut
    ) internal view returns (Receipt memory receipt) {
        return _getBridgeStorage().receipts[isOut][nonce];
    }

    function getReceiptTimestamp(
        uint256 nonce,
        bool isOut
    ) internal view returns (uint256 timestamp) {
        return _getBridgeStorage().receiptTimestamp[isOut][nonce];
    }

    function getReceiptStatus(
        uint256 nonce,
        bool isOut
    ) internal view returns (ReceiptStatus status) {
        return _getBridgeStorage().receiptStatus[isOut][nonce];
    }

    function send(
        bytes32 tokenAddress,
        bytes32 recipient,
        uint256 amount,
        uint256 chainTo,
        Fee calldata fee,
        bytes calldata feeSignature
    ) external payable override returns (Receipt memory receipt) {
        require(isValidFee(fee, feeSignature), "Invalid fee signature");
        require(amount > 0, "Invalid amount");
        require(amount == fee.amountToSend, "Invalid amount");
        address token = tokenAddress.toAddress();
        if (token == address(0)) {
            require(
                fee.amount + fee.amountToSend == msg.value,
                "Invalid value amount sent"
            );
            _wrap(fee.amountToSend);
            token = samb();
        } else {
            require(fee.amount == msg.value, "Invalid fee amount");
            bool received = IERC20(token).transferFrom(
                msg.sender,
                address(this),
                amount
            );
            require(received, "Transfer failed");
        }
        tokenAddress = bytes32(abi.encodePacked(token));
        require(!pausedTokens(token), "Token is paused");
        require(
            token2external(token) != bytes32(0),
            "Unknown destination token address"
        );
        Receipt memory _receipt = Receipt({
            from: bytes32(abi.encodePacked(msg.sender)),
            to: recipient,
            tokenAddress: tokenAddress,
            amount: amount,
            chainFrom: block.chainid,
            chainTo: chainTo,
            nonce: _useNonce(address(this))
        });
        BridgeStorage storage $ = _getBridgeStorage();
        $.receipts[true][_receipt.nonce] = _receipt;
        $.receiptTimestamp[true][_receipt.nonce] = block.timestamp;
        $.receiptStatus[true][_receipt.nonce] = ReceiptStatus.Locked;
        emit TokenLocked(_receipt);
        return _receipt;
    }

    function cancel(
        uint256 nonce,
        bytes calldata signature
    ) external override returns (bool success) {
        require(
            getReceiptStatus(nonce, true) == ReceiptStatus.Locked,
            "Invalid receipt status"
        );
        Receipt memory receipt = getReceipt(nonce, true);
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                receipt.from,
                receipt.to,
                receipt.tokenAddress,
                receipt.amount,
                receipt.chainFrom,
                receipt.chainTo,
                receipt.nonce,
                ReceiptStatus.Canceled
            )
        );
        if (msg.sender != owner()) {
            require(
                block.timestamp - getReceiptTimestamp(nonce, true) >
                    submissionWindow() * 5,
                "Submission window is not passed"
            );
            require(
                SignatureChecker.isValidSignatureNow(
                    MPCAddress(),
                    messageHash,
                    signature
                ),
                "Invalid signature"
            );
        }
        address token = receipt.tokenAddress.toAddress();
        address withdrawTo = receipt.from.toAddress();
        bool unlocked = false;
        if (token == samb()) {
            _unwrap(receipt.amount);
            (unlocked, ) = payable(withdrawTo).call{value: receipt.amount}("");
        } else {
            unlocked = IERC20(token).transferFrom(
                address(this),
                withdrawTo,
                receipt.amount
            );
        }
        require(unlocked, "Transfer failed");
        BridgeStorage storage $ = _getBridgeStorage();
        $.receiptStatus[true][nonce] = ReceiptStatus.Canceled;
        emit TokenLockCanceled(receipt);
        return true;
    }

    function validateClaims(
        uint256[] calldata receipt_nonces,
        bytes calldata signature
    ) external override returns (bool success) {
        require(
            SignatureChecker.isValidSignatureNow(
                MPCAddress(),
                keccak256(abi.encodePacked(receipt_nonces)),
                signature
            ),
            "Invalid signature"
        );
        BridgeStorage storage $ = _getBridgeStorage();
        for (uint256 i = 0; i < receipt_nonces.length; i++) {
            require(
                getReceiptStatus(receipt_nonces[i], true) ==
                    ReceiptStatus.Locked,
                "Invalid receipt status"
            );
            $.receiptStatus[true][receipt_nonces[i]] = ReceiptStatus.Unlocked;
        }
        return true;
    }

    function claim(
        Receipt calldata receipt,
        bytes calldata signature
    ) external override returns (bool success) {
        require(
            getReceiptStatus(receipt.nonce, false) != ReceiptStatus.Unlocked,
            "Invalid receipt status"
        );
        require(receipt.chainTo == block.chainid, "Invalid destination chain");
        address token = external2token(receipt.tokenAddress);
        require(token != address(0), "Unknown token address");
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                receipt.from,
                receipt.to,
                receipt.tokenAddress,
                receipt.amount,
                receipt.chainFrom,
                receipt.chainTo,
                receipt.nonce
            )
        );
        require(
            SignatureChecker.isValidSignatureNow(
                MPCAddress(),
                messageHash,
                signature
            ),
            "Invalid signature"
        );
        require(!pausedTokens(token), "Token is paused");
        bool unlocked = false;
        address receiver = receipt.to.toAddress();
        if (token == samb()) {
            _unwrap(receipt.amount);
            (unlocked, ) = payable(receiver).call{value: receipt.amount}("");
            require(unlocked, "Transfer failed");
        } else {
            unlocked = IERC20(token).transferFrom(
                address(this),
                receiver,
                receipt.amount
            );
        }
        require(unlocked, "Transfer failed");
        BridgeStorage storage $ = _getBridgeStorage();
        $.receiptStatus[false][receipt.nonce] = ReceiptStatus.Unlocked;
        emit TokenUnlocked(receipt);
        return true;
    }
}
