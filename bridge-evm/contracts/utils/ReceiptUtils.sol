// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interface/IBridgeTypes.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

library ReceiptUtils {
    using MessageHashUtils for bytes32;
    function toHash(IBridgeTypes.Receipt calldata receipt) internal pure returns (bytes32) {
        return toEthSignedMessageHash(receipt);
    }

    function toEthSignedMessageHash(IBridgeTypes.Receipt calldata receipt) internal pure returns (bytes32) {
        bytes32 messageHash = keccak256(
            abi.encode(
                receipt.from,
                receipt.to,
                receipt.tokenAddress,
                receipt.amount,
                receipt.chainFrom,
                receipt.chainTo,
                receipt.nonce
            )
        );
        return messageHash.toEthSignedMessageHash();
    }
}