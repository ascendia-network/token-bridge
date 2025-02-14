// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IValidation} from "./interface/IValidation.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import {BridgeUpgradeable} from "./upgradeable/BridgeUpgradeable.sol";
import {Bridge} from "./Bridge.sol";

contract BridgeSolana is Bridge {
    using SafeCast for uint256;

    /// @inheritdoc BridgeUpgradeable
    /// @dev For Solana, the receipt is generated adding the nonce of the recipient address to the data field as a uint64
    function generateReceipt(
        address sender,
        bytes32 recipient,
        uint256 amountTo,
        SendPayload calldata payload,
        ExternalToken memory externalToken_
    ) internal override returns (FullReceipt memory){
        FullReceipt memory _receipt = FullReceipt({
            from: bytes32(uint256(uint160(sender))),
            to: recipient,
            tokenAddressFrom: payload.tokenAddress,
            tokenAddressTo: externalToken_.externalTokenAddress,
            amountFrom: payload.amountToSend,
            amountTo: amountTo,
            chainFrom: block.chainid,
            chainTo: payload.destChainId,
            eventId: _useNonce(address(this)),
            flags: payload.flags >> 65, // remove sender flags
            data: abi.encodePacked(_useNonce(recipient).toUint64())
        });
        return _receipt;
    }

}
