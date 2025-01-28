// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./upgradeable/BridgeUpgradeable.sol";

contract Bridge is BridgeUpgradeable {
     function initialize(
        address owner_,
        address SAMB_,
        address MPCAddress_,
        address feeSigner_,
        address payable feeReceiver_,
        uint256 feeValidityWindow_,
        uint256 submissionWindow_
     ) public initializer {
        __Bridge_init(
            owner_,
            SAMB_,
            MPCAddress_,
            feeSigner_,
            feeReceiver_,
            feeValidityWindow_,
            submissionWindow_
        );
    }
}
