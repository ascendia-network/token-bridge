// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {Initializable} from
    "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IAccessManaged} from
    "@openzeppelin/contracts/access/manager/IAccessManaged.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {ITokenManager} from "../../contracts/interface/ITokenManager.sol";
import {IBridge} from "../../contracts/interface/IBridge.sol";
import {IBridgeTypes} from "../../contracts/interface/IBridgeTypes.sol";
import {IValidation} from "../../contracts/interface/IValidation.sol";
import {IWrapped} from "../../contracts/interface/IWrapped.sol";

import {Bridge} from "../../contracts/Bridge.sol";
import {Validator} from "../../contracts/Validator.sol";
import {ERC20Bridged} from "../../contracts/token/ERC20Bridged.sol";

import {ReceiptUtils} from "../../contracts/utils/ReceiptUtils.sol";
import {PayloadUtils} from "../../contracts/utils/PayloadUtils.sol";

import {sAMB} from "../mocks/sAMB.sol";

import {BridgeTestBase} from "./BridgeBase.t.sol";

abstract contract BridgeValidationTest is BridgeTestBase {
    using EnumerableSet for EnumerableSet.AddressSet;
    using ReceiptUtils for IBridgeTypes.Receipt;
    using PayloadUtils for IBridgeTypes.SendPayload;

    function test_feeValidity_change_reflects_on_bridge() public {
        uint256 newFeeValidityWindow = 200;
        validatorInstance.setFeeValidityWindow(newFeeValidityWindow);
        assertEq(validatorInstance.feeValidityWindow(), newFeeValidityWindow);
        assertEq(bridgeInstance.feeValidityWindow(), newFeeValidityWindow);
    }

    function test_sendingToBridge() public {
        vm.warp(1000);
        bridgeInstance.addToken(address(wrappedToken), bytes32("sAMB"), false);
        vm.startPrank(alice);
        vm.deal(alice, 100 ether);
        uint256 amountToSend = 1 ether;
        wrappedToken.deposit{value: 1 ether}();
        
        wrappedToken.approve(address(bridgeInstance), 1 ether);

        uint256 balanceWrappedBefore = wrappedToken.balanceOf(alice);
        uint256 balanceNativeAliceBefore = alice.balance;
        uint256 balanceFeeBefore = fee.balance;
        uint256 destinationChain = 1;
        uint256 feeAmount = 1000 wei;
        
        IBridgeTypes.SendPayload memory payload = IBridgeTypes.SendPayload({
            tokenAddress: bytes32(uint256(uint160(address(wrappedToken)))),
            amountToSend: amountToSend,
            feeAmount: feeAmount,
            timestamp: block.timestamp - 50,
            flags: 0,
            flagData: new bytes(0)
        });
        bytes32 digest = payload.toHash();
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(payloadSigner.PK, digest);
        bytes memory payloadSignature = abi.encodePacked(r, s, v); // note the order here is different from line above.
        vm.expectEmit(address(bridgeInstance));
        emit IBridge.TokenLocked(
            IBridgeTypes.Receipt({
                from: bytes32(uint256(uint160(alice))),
                to: bytes32("SOLANA_ADDRESS"),
                tokenAddress: payload.tokenAddress,
                amount: payload.amountToSend,
                chainFrom: block.chainid,
                chainTo: destinationChain,
                eventId: 0,
                flags: 0,
                data: abi.encodePacked(uint64(0))
            })
        );
        bridgeInstance.send{value: feeAmount}(
            bytes32("SOLANA_ADDRESS"),
            destinationChain,
            payload,
            payloadSignature
        );
        
        uint256 balanceWrappedAfter = wrappedToken.balanceOf(address(alice));
        assertEq(balanceWrappedBefore - amountToSend, balanceWrappedAfter);
        uint256 balanceFeeAfter = fee.balance;
        assertEq(balanceFeeBefore + feeAmount, balanceFeeAfter);
        uint256 balanceNativeAliceAfter = alice.balance;
        assertApproxEqRel(balanceNativeAliceBefore - feeAmount, balanceNativeAliceAfter, 0.01e18);
        // Next event ID incremented
        assertEq(bridgeInstance.nextEventID(), 1);
    }
}
