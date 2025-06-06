// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {IBridge} from "../../contracts/interface/IBridge.sol";

import {BridgeFlags, BridgeTypes} from "../../contracts/interface/BridgeTypes.sol";
import {ITokenManager} from "../../contracts/interface/ITokenManager.sol";

import {Bridge} from "../../contracts/Bridge.sol";

import {PayloadUtils} from "../../contracts/utils/PayloadUtils.sol";
import {ReceiptUtils} from "../../contracts/utils/ReceiptUtils.sol";

import {SigUtils} from "../SigUtils.sol";
import {BridgeTestBase} from "./BridgeBase.t.sol";
import {MockERC20Permit} from "../mocks/MockERC20.sol";

// Huge mess cuz Stack too deep error
abstract contract BridgeSendTest is BridgeTestBase {
    using ReceiptUtils for BridgeTypes.FullReceipt;
    using ReceiptUtils for BridgeTypes.MiniReceipt;
    using PayloadUtils for BridgeTypes.SendPayload;

    function signPermit(
        address token,
        address owner,
        address spender,
        uint256 value,
        uint256 nonce,
        uint256 deadline,
        uint256 PK
    ) public view returns (uint8 v, bytes32 r, bytes32 s) {
        SigUtils.Permit memory permit = SigUtils.Permit({
            owner: owner,
            spender: spender,
            value: value,
            nonce: nonce,
            deadline: deadline
        });

        bytes32 digest = SigUtils.getTypedDataHash(
            permit,
            ERC20Permit(address(token)).DOMAIN_SEPARATOR()
        );
        return vm.sign(PK, digest);
    }

    /// Convert the amount based on token decimals
    /// @param tokenFrom address of the token
    /// @param amount amount to convert
    /// @param decimalsTo token decimals
    /// @return convertedAmount converted amount
    function _convertAmount(
        address tokenFrom,
        uint256 amount,
        uint8 decimalsTo
    ) private view returns (uint256 convertedAmount) {
        IERC20Metadata token = IERC20Metadata(tokenFrom);
        uint8 decimalsFrom = token.decimals();
        if (decimalsFrom < decimalsTo) {
            // Ex.: 1234567890 with 3 decimals to 6 decimals => 1234567_890 * 10 ** (6 - 3) = 1234567_890000
            return amount * (10 ** uint256(decimalsTo - decimalsFrom));
        } else if (decimalsFrom > decimalsTo) {
            // Ex.: 1234567890 with 6 decimals to 3 decimals => 1234_567890 / 10 ** (6 - 3) = 1234_567
            return amount / (10 ** uint256(decimalsFrom - decimalsTo));
        } else {
            return amount;
        }
    }

    function generateSendingValues(
        address token,
        uint256 amountToSend,
        uint256 feeAmount,
        uint256 flags,
        address sender,
        bytes32 recipient,
        uint256 chainDest
    )
        public
        view
        returns (
            BridgeTypes.SendPayload memory payload,
            BridgeTypes.FullReceipt memory receipt,
            bytes memory payloadSignature
        )
    {
        payload = BridgeTypes.SendPayload({
            chainFrom: block.chainid,
            chainTo: chainDest,
            tokenAddress: bytes32(uint256(uint160(token))),
            externalTokenAddress: token == address(wrappedToken)
                ? bytes32("AMB_EXT")
                : bytes32("PMT_EXT"),
            amountToSend: amountToSend,
            feeAmount: feeAmount,
            timestamp: block.timestamp,
            flags: flags,
            flagData: new bytes(0)
        });
        ITokenManager.ExternalToken memory extToken = bridgeInstance
            .externalToken(payload.externalTokenAddress);
        receipt = BridgeTypes.FullReceipt({
            from: bytes32(uint256(uint160(address(sender)))),
            to: recipient,
            tokenAddressFrom: payload.tokenAddress,
            tokenAddressTo: extToken.externalTokenAddress,
            amountFrom: payload.amountToSend,
            amountTo: _convertAmount(
                token,
                payload.amountToSend,
                extToken.decimals
            ),
            chainFrom: block.chainid,
            chainTo: chainDest,
            eventId: bridgeInstance.nextEventID(),
            flags: 0,
            data: ""
        });
        payloadSignature = signPayload(payload, payloadSigner.PK);
    }

    function signPayload(
        BridgeTypes.SendPayload memory payload,
        uint256 PK
    ) public pure returns (bytes memory signature) {
        bytes32 digest = payload.toHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(PK, digest);
        return abi.encodePacked(r, s, v);
    }

    function getSigner(string memory name) public returns (Signer memory) {
        (address sender, uint256 senderPk) = makeAddrAndKey(name);
        return Signer({Address: sender, PK: senderPk});
    }

    function approveOrPermit(
        bool isApprove,
        address token,
        Signer memory signer,
        uint256 amount,
        address spender
    ) public returns (uint8 v, bytes32 r, bytes32 s) {
        if (isApprove) {
            vm.startPrank(signer.Address);
            ERC20(token).approve(spender, amount);
            return (0, bytes32(0), bytes32(0));
        } else {
            return
                signPermit(
                    token,
                    signer.Address,
                    spender,
                    amount,
                    ERC20Permit(token).nonces(signer.Address),
                    block.timestamp + 1000,
                    signer.PK
                );
        }
    }

    function prepareSend(uint256 tokenAmount) public returns (Signer memory) {
        Signer memory signer = getSigner("sender");
        vm.warp(1000);
        ITokenManager.ExternalTokenUnmapped memory extToken = ITokenManager
            .ExternalTokenUnmapped({
                externalTokenAddress: bytes32("PMT_EXT"),
                decimals: permittableToken.decimals(),
                chainId: SOLANA_DEVNET
            });
        bridgeInstance.addToken(address(permittableToken), extToken, false);
        vm.startPrank(signer.Address);
        vm.deal(signer.Address, 100 ether);
        deal(address(permittableToken), signer.Address, tokenAmount);
        return signer;
    }

    function prepareSend(
        uint256 tokenAmount,
        Signer memory signer
    ) public returns (Signer memory) {
        vm.warp(1000);
        ITokenManager.ExternalTokenUnmapped memory extToken = ITokenManager
            .ExternalTokenUnmapped({
                externalTokenAddress: bytes32("PMT_EXT"),
                decimals: permittableToken.decimals(),
                chainId: SOLANA_DEVNET
            });
        try
            bridgeInstance.addToken(address(permittableToken), extToken, false)
        {} catch (bytes memory lowLevelData) {
            if (
                bytes4(
                    abi.encodeWithSelector(
                        ITokenManager.TokenAlreadyAdded.selector,
                        address(permittableToken)
                    )
                ) == bytes4(lowLevelData)
            ) {
                console.log("Token already added");
            }
        }
        vm.startPrank(signer.Address);
        vm.deal(signer.Address, 100 ether);
        deal(address(permittableToken), signer.Address, tokenAmount);
        return signer;
    }

    function prepareSendNative(uint256 amount) public returns (Signer memory) {
        Signer memory signer = getSigner("sender");
        vm.warp(1000);
        ITokenManager.ExternalTokenUnmapped memory extToken = ITokenManager
            .ExternalTokenUnmapped({
                externalTokenAddress: bytes32("AMB_EXT"),
                decimals: permittableToken.decimals(),
                chainId: SOLANA_DEVNET
            });
        bridgeInstance.addToken(address(wrappedToken), extToken, false);
        vm.startPrank(signer.Address);
        vm.deal(signer.Address, amount + 1 ether);
        return signer;
    }

    function send(
        Signer memory signer,
        BridgeTypes.SendPayload memory payload,
        BridgeTypes.FullReceipt memory receipt,
        bytes memory payloadSignature
    ) public {
        uint256 balanceTokenBefore = permittableToken.balanceOf(signer.Address);
        uint256 balanceNativeSenderBefore = signer.Address.balance;
        uint256 balanceFeeBefore = fee.balance;
        vm.expectEmit(address(bridgeInstance));
        emit IBridge.TokenLocked(receipt);
        bridgeInstance.send{value: payload.feeAmount}(
            receipt.to,
            payload,
            payloadSignature
        );
        assertEq(
            balanceTokenBefore - payload.amountToSend,
            permittableToken.balanceOf(signer.Address)
        );
        assertEq(balanceFeeBefore + payload.feeAmount, fee.balance);
        assertApproxEqRel(
            balanceNativeSenderBefore - payload.feeAmount,
            signer.Address.balance,
            0.01e18
        );
        // Next event ID incremented
        assertEq(bridgeInstance.nextEventID(), receipt.eventId + 1);
    }

    function sendNative(
        Signer memory signer,
        BridgeTypes.SendPayload memory payload,
        BridgeTypes.FullReceipt memory receipt,
        bytes memory payloadSignature
    ) public {
        uint256 balanceNativeSenderBefore = signer.Address.balance;
        uint256 balanceFeeBefore = fee.balance;
        vm.expectEmit(address(bridgeInstance));
        emit IBridge.TokenLocked(receipt);
        bridgeInstance.send{value: payload.feeAmount + payload.amountToSend}(
            bytes32("SOLANA_ADDRESS"),
            payload,
            payloadSignature
        );
        assertEq(balanceFeeBefore + payload.feeAmount, fee.balance);
        assertApproxEqRel(
            balanceNativeSenderBefore -
                (payload.feeAmount + payload.amountToSend),
            signer.Address.balance,
            0.01e18
        );
        // Next event ID incremented
        assertEq(bridgeInstance.nextEventID(), 1);
    }

    function send(
        Signer memory signer,
        BridgeTypes.SendPayload memory payload,
        BridgeTypes.FullReceipt memory receipt,
        bytes memory payloadSignature,
        uint8 vP,
        bytes32 rP,
        bytes32 sP
    ) public {
        uint256 balanceTokenBefore = permittableToken.balanceOf(signer.Address);
        uint256 balanceNativeSenderBefore = signer.Address.balance;
        uint256 balanceFeeBefore = fee.balance;
        vm.expectEmit(address(bridgeInstance));
        emit IBridge.TokenLocked(receipt);
        bridgeInstance.send{value: payload.feeAmount}(
            bytes32("SOLANA_ADDRESS"),
            payload,
            payloadSignature,
            block.timestamp + 1000,
            vP,
            rP,
            sP
        );
        assertEq(
            balanceTokenBefore - payload.amountToSend,
            permittableToken.balanceOf(signer.Address)
        );
        assertEq(balanceFeeBefore + payload.feeAmount, fee.balance);
        assertApproxEqRel(
            balanceNativeSenderBefore - payload.feeAmount,
            signer.Address.balance,
            0.01e18
        );
        // Next event ID incremented
        assertEq(bridgeInstance.nextEventID(), 1);
    }

    function test_sendingToBridge(bool isPermit, uint256 amountToSend) public {
        vm.assume(amountToSend > 0);
        Signer memory signer = prepareSend(amountToSend);
        (uint8 vP, bytes32 rP, bytes32 sP) = approveOrPermit(
            !isPermit,
            address(permittableToken),
            signer,
            amountToSend,
            address(bridgeInstance)
        );
        uint256 destinationChain = SOLANA_DEVNET;
        uint256 feeAmount = 1000 wei;
        uint256 flag = isPermit ? BridgeFlags.SEND_WITH_PERMIT : 0;
        (
            BridgeTypes.SendPayload memory payload,
            BridgeTypes.FullReceipt memory receipt,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(permittableToken),
                amountToSend,
                feeAmount,
                flag,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        !isPermit
            ? send(signer, payload, receipt, payloadSignature)
            : send(signer, payload, receipt, payloadSignature, vP, rP, sP);
    }

    function test_sendingToBridge_multiple(uint256 amountToSend) public {
        bool isPermit = false;
        vm.assume(amountToSend > 0 && amountToSend < type(uint256).max / 2);
        Signer memory signer = prepareSend(amountToSend * 2);
        approveOrPermit(
            !isPermit,
            address(permittableToken),
            signer,
            amountToSend * 2,
            address(bridgeInstance)
        );
        uint256 destinationChain = SOLANA_DEVNET;
        uint256 feeAmount = 1000 wei;
        (
            BridgeTypes.SendPayload memory payload,
            BridgeTypes.FullReceipt memory receipt,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(permittableToken),
                amountToSend,
                feeAmount,
                0,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        send(signer, payload, receipt, payloadSignature);
        // User nonce and contract nonce was incremented after the first send
        (payload, receipt, payloadSignature) = generateSendingValues(
            address(permittableToken),
            amountToSend,
            feeAmount,
            0,
            signer.Address,
            bytes32("SOLANA_ADDRESS"),
            destinationChain
        );
        send(signer, payload, receipt, payloadSignature);
        vm.stopPrank();
        // Other User nonce will be 2 here (same recepient) but contract nonce will be 3 after the second send
        signer = getSigner("singer2");
        prepareSend(amountToSend * 2, signer);
        approveOrPermit(
            !isPermit,
            address(permittableToken),
            signer,
            amountToSend * 2,
            address(bridgeInstance)
        );
        (payload, receipt, payloadSignature) = generateSendingValues(
            address(permittableToken),
            amountToSend,
            feeAmount,
            0,
            signer.Address,
            bytes32("SOLANA_ADDRESS"),
            destinationChain
        );
        send(signer, payload, receipt, payloadSignature);
        // Other User nonce will be 0 here (other recepient) but contract nonce will be 4 after the third send
        (payload, receipt, payloadSignature) = generateSendingValues(
            address(permittableToken),
            amountToSend,
            feeAmount,
            0,
            signer.Address,
            bytes32("SOLANA_ADDRESS2"),
            destinationChain
        );
        send(signer, payload, receipt, payloadSignature);
    }

    function test_sendingToBridge_native(uint256 amountToSend) public {
        vm.assume(amountToSend > 0 && amountToSend < 1000 ether);
        Signer memory signer = prepareSendNative(amountToSend);
        uint256 destinationChain = SOLANA_DEVNET;
        uint256 feeAmount = 1000 wei;
        (
            BridgeTypes.SendPayload memory payload,
            BridgeTypes.FullReceipt memory receipt,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(wrappedToken),
                amountToSend,
                feeAmount,
                BridgeFlags.SHOULD_WRAP,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        sendNative(signer, payload, receipt, payloadSignature);
    }

    function test_revertWhen_sendingToBridge_native_wrongAmount(
        uint256 amountToSend
    ) public {
        vm.assume(amountToSend > 0 && amountToSend < 1000 ether);
        Signer memory signer = prepareSendNative(amountToSend);
        uint256 destinationChain = SOLANA_DEVNET;
        uint256 feeAmount = 1000 wei;
        (
            BridgeTypes.SendPayload memory payload,
            ,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(wrappedToken),
                amountToSend,
                feeAmount,
                BridgeFlags.SHOULD_WRAP,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        vm.expectRevert(
            abi.encodeWithSelector(
                IBridge.InvalidValueSent.selector,
                payload.feeAmount + payload.amountToSend + 1,
                payload.feeAmount + payload.amountToSend
            )
        );
        bridgeInstance.send{
            value: payload.feeAmount + payload.amountToSend + 1
        }(bytes32("SOLANA_ADDRESS"), payload, payloadSignature);
    }

    function test_revertWhen_sendingToBridge_PermitInvalidFlag() public {
        uint256 amountToSend = 100 ether;
        Signer memory signer = prepareSend(amountToSend);
        (uint8 vP, bytes32 rP, bytes32 sP) = approveOrPermit(
            false,
            address(permittableToken),
            signer,
            amountToSend,
            address(bridgeInstance)
        );
        uint256 destinationChain = SOLANA_DEVNET;
        uint256 feeAmount = 1000 wei;
        uint256 flag = 0;
        (
            BridgeTypes.SendPayload memory payload,
            ,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(permittableToken),
                amountToSend,
                feeAmount,
                flag,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        vm.expectRevert(IBridge.InvalidPermitFlag.selector);
        bridgeInstance.send{value: payload.feeAmount}(
            bytes32("SOLANA_ADDRESS"),
            payload,
            payloadSignature,
            block.timestamp + 1000,
            vP,
            rP,
            sP
        );
    }

    function test_revertWhen_sendingToBridge_Amount0() public {
        uint256 amountToSend = 0;
        Signer memory signer = prepareSend(amountToSend);
        approveOrPermit(
            true,
            address(permittableToken),
            signer,
            amountToSend,
            address(bridgeInstance)
        );
        uint256 destinationChain = SOLANA_DEVNET;
        uint256 feeAmount = 1000 wei;
        uint256 flag = 0;
        (
            BridgeTypes.SendPayload memory payload,
            ,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(permittableToken),
                amountToSend,
                feeAmount,
                flag,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        vm.expectRevert(IBridge.InvalidAmount.selector);
        bridgeInstance.send{value: payload.feeAmount}(
            bytes32("SOLANA_ADDRESS"),
            payload,
            payloadSignature
        );
    }

    function test_revertWhen_sendingToBridge_WrongDestChain() public {
        uint256 amountToSend = 100 ether;
        Signer memory signer = prepareSend(amountToSend);
        approveOrPermit(
            true,
            address(permittableToken),
            signer,
            amountToSend,
            address(bridgeInstance)
        );
        uint256 destinationChain = block.chainid;
        uint256 feeAmount = 1000 wei;
        uint256 flag = 0;
        (
            BridgeTypes.SendPayload memory payload,
            ,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(permittableToken),
                amountToSend,
                feeAmount,
                flag,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        vm.expectRevert(IBridge.InvalidChain.selector);
        bridgeInstance.send{value: payload.feeAmount}(
            bytes32("SOLANA_ADDRESS"),
            payload,
            payloadSignature
        );
    }

    function test_revertWhen_sendingToBridge_Paused() public {
        uint256 amountToSend = 100 ether;
        Signer memory signer = prepareSend(amountToSend);
        approveOrPermit(
            true,
            address(permittableToken),
            signer,
            amountToSend,
            address(bridgeInstance)
        );
        uint256 destinationChain = SOLANA_DEVNET;
        uint256 feeAmount = 1000 wei;
        uint256 flag = 0;
        (
            BridgeTypes.SendPayload memory payload,
            ,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(permittableToken),
                amountToSend,
                feeAmount,
                flag,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        vm.stopPrank();
        bridgeInstance.pauseToken(address(permittableToken));
        vm.startPrank(signer.Address);
        vm.expectRevert(
            abi.encodeWithSelector(
                ITokenManager.TokenIsPaused.selector,
                address(permittableToken)
            )
        );
        bridgeInstance.send{value: payload.feeAmount}(
            bytes32("SOLANA_ADDRESS"),
            payload,
            payloadSignature
        );
    }

    function test_revertWhen_sendingToBridge_InvalidFee() public {
        uint256 amountToSend = 100 ether;
        Signer memory signer = prepareSend(amountToSend);
        approveOrPermit(
            true,
            address(permittableToken),
            signer,
            amountToSend,
            address(bridgeInstance)
        );
        uint256 destinationChain = SOLANA_DEVNET;
        uint256 feeAmount = 1000 wei;
        uint256 flag = 0;
        (
            BridgeTypes.SendPayload memory payload,
            ,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(permittableToken),
                amountToSend,
                feeAmount,
                flag,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        vm.expectRevert(
            abi.encodeWithSelector(
                IBridge.InvalidValueSent.selector,
                payload.feeAmount + 1,
                payload.feeAmount
            )
        );
        bridgeInstance.send{value: payload.feeAmount + 1}(
            bytes32("SOLANA_ADDRESS"),
            payload,
            payloadSignature
        );
    }

    function test_revertWhen_send_BadFeeReceiver() public {
        uint256 amountToSend = 100 ether;
        Signer memory signer = prepareSend(amountToSend);
        approveOrPermit(
            true,
            address(permittableToken),
            signer,
            amountToSend,
            address(bridgeInstance)
        );
        uint256 destinationChain = SOLANA_DEVNET;
        uint256 feeAmount = 1000 wei;
        uint256 flag = 0;
        (
            BridgeTypes.SendPayload memory payload,
            ,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(permittableToken),
                amountToSend,
                feeAmount,
                flag,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        vm.expectRevert(IBridge.SendFailed.selector);
        bridgeInstance.send{value: payload.feeAmount}(
            bytes32("SOLANA_ADDRESS"),
            payload,
            payloadSignature
        );
    }

    function test_revertWhen_send_BadChainId() public {
        uint256 amountToSend = 100 ether;
        Signer memory signer = prepareSend(amountToSend);
        approveOrPermit(
            true,
            address(permittableToken),
            signer,
            amountToSend,
            address(bridgeInstance)
        );
        uint256 destinationChain = uint64(1);
        uint256 feeAmount = 1000 wei;
        uint256 flag = 0;
        (
            BridgeTypes.SendPayload memory payload,
            ,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(permittableToken),
                amountToSend,
                feeAmount,
                flag,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        vm.expectRevert(IBridge.InvalidChain.selector);
        bridgeInstance.send{value: payload.feeAmount}(
            bytes32("SOLANA_ADDRESS"),
            payload,
            payloadSignature
        );
    }

    function test_revertWhen_send_SelfChainId() public {
        uint256 amountToSend = 100 ether;
        Signer memory signer = prepareSend(amountToSend);
        approveOrPermit(
            true,
            address(permittableToken),
            signer,
            amountToSend,
            address(bridgeInstance)
        );
        uint256 destinationChain = block.chainid;
        uint256 feeAmount = 1000 wei;
        uint256 flag = 0;
        (
            BridgeTypes.SendPayload memory payload,
            ,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(permittableToken),
                amountToSend,
                feeAmount,
                flag,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        vm.expectRevert(IBridge.InvalidChain.selector);
        bridgeInstance.send{value: payload.feeAmount}(
            bytes32("SOLANA_ADDRESS"),
            payload,
            payloadSignature
        );
    }

    function test_revertWhen_send_ERC20TransferFailed() public {
        uint256 amountToSend = 100 ether;
        Signer memory signer = prepareSend(amountToSend);
        approveOrPermit(
            true,
            address(permittableToken),
            signer,
            amountToSend,
            address(bridgeInstance)
        );
        uint256 destinationChain = SOLANA_DEVNET;
        uint256 feeAmount = 1000 wei;
        uint256 flag = 0;
        (
            BridgeTypes.SendPayload memory payload,
            ,
            bytes memory payloadSignature
        ) = generateSendingValues(
                address(permittableToken),
                amountToSend,
                feeAmount,
                flag,
                signer.Address,
                bytes32("SOLANA_ADDRESS"),
                destinationChain
            );
        vm.mockCall(
            address(permittableToken),
            abi.encodeWithSelector(
                ERC20.transferFrom.selector,
                signer.Address,
                address(bridgeInstance),
                amountToSend
            ),
            abi.encode(false)
        );
        vm.expectRevert(IBridge.TransferFailed.selector);
        bridgeInstance.send{value: payload.feeAmount}(
            bytes32("SOLANA_ADDRESS"),
            payload,
            payloadSignature
        );
    }
}
