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
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {ITokenManager} from "../contracts/interface/ITokenManager.sol";
import {IValidation} from "../contracts/interface/IValidation.sol";
import {IWrapped} from "../contracts/interface/IWrapped.sol";

import {Bridge} from "../contracts/Bridge.sol";
import {Validator} from "../contracts/Validator.sol";
import {ERC20Bridged} from "../contracts/token/ERC20Bridged.sol";

import {sAMB} from "./mocks/SAMB.sol";

contract BridgeTest is Test {

    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 private constant coverageProfile =
        keccak256(abi.encodePacked("coverage"));

    function isCoverage() internal view returns (bool) {
        return keccak256(
            abi.encodePacked(vm.envOr("FOUNDRY_PROFILE", string("default")))
        ) == coverageProfile;
    }

    uint256 private constant nativeSendAmount = 1 ether;
    AccessManager private authority;
    Validator private validatorInstance;
    Bridge private bridgeInstance;
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

    function setUpBridge(
        address authorityAddress,
        IWrapped samb,
        IValidation validation,
        address payable feeReceiver,
        uint256 nsa
    )
        public
        virtual
        returns (Bridge)
    {
        address payable proxy;
        if (isCoverage()) {
            address bridge = address(new Bridge());
            proxy = payable(
                address(
                    UnsafeUpgrades.deployUUPSProxy(
                        bridge,
                        abi.encodeCall(
                            Bridge.initialize,
                            (
                                authorityAddress,
                                address(samb),
                                validation,
                                feeReceiver,
                                nsa
                            )
                        )
                    )
                )
            );
        } else {
            proxy = payable(
                address(
                    Upgrades.deployUUPSProxy(
                        "Bridge.sol",
                        abi.encodeCall(
                            Bridge.initialize,
                            (
                                authorityAddress,
                                address(samb),
                                validation,
                                feeReceiver,
                                nsa
                            )
                        )
                    )
                )
            );
        }
        bridgeInstance = Bridge(proxy);
        return bridgeInstance;
    }

    function setUp() public {
        authority = new AccessManager(address(this));
        validatorSet.add(alice);
        validatorSet.add(bob);
        validatorSet.add(chris);

        setUpWrappedToken();
        setUpValidator(address(authority), validatorSet.values(), deadBeef, 100);
        setUpBridge(
            address(authority),
            wrappedToken,
            validatorInstance,
            fee,
            nativeSendAmount
        );
    }

    function addToken(address token, bytes32 externalTokenAddress) public {
        bridgeInstance.addToken(token, externalTokenAddress);
        assertEq(bridgeInstance.bridgableTokens(token), true);
        assertEq(bridgeInstance.external2token(externalTokenAddress), token);
        assertEq(bridgeInstance.pausedTokens(token), true);
    }

    function addToken(
        address token,
        bytes32 externalTokenAddress,
        bool paused
    )
        public
    {
        bridgeInstance.addToken(token, externalTokenAddress, paused);
        assertEq(bridgeInstance.bridgableTokens(token), true);
        assertEq(bridgeInstance.external2token(externalTokenAddress), token);
        assertEq(bridgeInstance.pausedTokens(token), paused);
    }

    function mapToken(address token, bytes32 externalTokenAddress) public {
        bridgeInstance.mapExternalToken(externalTokenAddress, token);
        assertEq(bridgeInstance.external2token(externalTokenAddress), token);
    }

    function test_revertWhen_initialize_twice() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        validatorInstance.initialize(
            address(authority), validatorSet.values(), deadBeef, 100
        );
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        bridgeInstance.initialize(
            address(authority),
            address(wrappedToken),
            validatorInstance,
            payable(alice),
            nativeSendAmount
        );
    }

    function test_change_feeReceiver() public {
        bridgeInstance.setFeeReceiver(payable(alice));
        assertEq(bridgeInstance.feeReceiver(), payable(alice));
        bridgeInstance.setFeeReceiver(fee);
        assertEq(bridgeInstance.feeReceiver(), fee);
    }

    function test_revertIf_change_feeReceiver_not_authority() public {
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        bridgeInstance.setFeeReceiver(payable(alice));
        vm.stopPrank();
    }

    function test_change_nativeSendAmount() public {
        bridgeInstance.setNativeSendAmount(2 ether);
        assertEq(bridgeInstance.nativeSendAmount(), 2 ether);
        bridgeInstance.setNativeSendAmount(1 ether);
        assertEq(bridgeInstance.nativeSendAmount(), 1 ether);
    }

    function test_revertIf_change_nativeSendAmount_not_authority() public {
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        bridgeInstance.setNativeSendAmount(2 ether);
        vm.stopPrank();
    }

    function test_change_validator() public {
        Validator newValidator = Validator(address(0x0));
        bridgeInstance.setValidator(newValidator);
        assertEq(address(bridgeInstance.validator()), address(newValidator));
        bridgeInstance.setValidator(validatorInstance);
        assertEq(
            address(bridgeInstance.validator()), address(validatorInstance)
        );
    }

    function test_revertIf_change_validator_not_authority() public {
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        Validator newValidator = Validator(address(0x0));
        bridgeInstance.setValidator(newValidator);
        vm.stopPrank();
    }

    function test_addToken() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress);
    }

    function test_fuzz_addToken(
        address token,
        bytes32 externalTokenAddress
    )
        public
    {
        vm.assume(token != address(0));
        addToken(token, externalTokenAddress);
    }

    function test_revertIf_addToken_zero_address() public {
        vm.expectRevert(ITokenManager.TokenZeroAddress.selector);
        address token = address(0);
        bytes32 externalTokenAddress = bytes32("sAMB");
        bridgeInstance.addToken(token, externalTokenAddress);
    }

    function test_revertIf_addToken_not_authority() public {
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        bridgeInstance.addToken(token, externalTokenAddress);
        vm.stopPrank();
    }

    function test_revertIf_AlreadyAddedToken() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress);
        vm.expectRevert(
            abi.encodeWithSelector(
                ITokenManager.TokenAlreadyAdded.selector, address(wrappedToken)
            )
        );
        bridgeInstance.addToken(token, externalTokenAddress);
    }

    function test_removeToken() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress);
        bridgeInstance.removeToken(token, externalTokenAddress);
        assertEq(bridgeInstance.bridgableTokens(token), false);
        assertEq(
            bridgeInstance.external2token(externalTokenAddress), address(0x0)
        );
        assertEq(bridgeInstance.pausedTokens(token), true);
    }

    function test_fuzz_removeToken(
        address token,
        bytes32 externalTokenAddress
    )
        public
    {
        vm.assume(token != address(0));
        addToken(token, externalTokenAddress);
        bridgeInstance.removeToken(token, externalTokenAddress);
        assertEq(bridgeInstance.bridgableTokens(token), false);
        assertEq(
            bridgeInstance.external2token(externalTokenAddress), address(0x0)
        );
        assertEq(bridgeInstance.pausedTokens(token), true);
    }

    function test_revertIf_removeToken_not_authority() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress);
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        bridgeInstance.removeToken(token, externalTokenAddress);
        vm.stopPrank();
    }

    function test_revertIf_NotAddedToken() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        vm.expectRevert(
            abi.encodeWithSelector(
                ITokenManager.TokenNotAdded.selector, address(wrappedToken)
            )
        );
        bridgeInstance.removeToken(token, externalTokenAddress);
    }

    function test_mapExternalToken() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress);
        bytes32 newExternalTokenAddress = bytes32("sAMB2");
        bridgeInstance.mapExternalToken(newExternalTokenAddress, token);
        assertEq(bridgeInstance.external2token(newExternalTokenAddress), token);
    }

    function test_fuzz_mapExternalToken(
        address token,
        bytes32 externalTokenAddress,
        bytes32 newExternalTokenAddress
    )
        public
    {
        vm.assume(token != address(0));
        uint256 a;
        uint256 b;
        externalTokenAddress = bytes32(bound(a, 0, type(uint256).max / 2));
        newExternalTokenAddress =
            bytes32(bound(b, type(uint256).max / 2, type(uint256).max));
        addToken(token, externalTokenAddress);
        bridgeInstance.mapExternalToken(newExternalTokenAddress, token);
        assertEq(bridgeInstance.external2token(newExternalTokenAddress), token);
    }

    function test_revertIf_mapExternalToken_notAdded() public {
        address token = address(wrappedToken);
        vm.expectRevert(
            abi.encodeWithSelector(
                ITokenManager.TokenNotBridgable.selector, address(wrappedToken)
            )
        );
        bytes32 newExternalTokenAddress = bytes32("sAMB2");
        bridgeInstance.mapExternalToken(newExternalTokenAddress, token);
    }

    function test_revertIf_mapExternalToken_not_authority() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress);
        bytes32 newExternalTokenAddress = bytes32("sAMB2");
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        bridgeInstance.mapExternalToken(newExternalTokenAddress, token);
        vm.stopPrank();
    }

    function test_revertIf_mapExternalToken_alreadyMapped() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        bytes32 newExternalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress);
        vm.expectRevert(
            abi.encodeWithSelector(
                ITokenManager.TokenAlreadyMapped.selector,
                newExternalTokenAddress
            )
        );
        bridgeInstance.mapExternalToken(newExternalTokenAddress, token);
    }

    function test_unmapExternalToken() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress);
        bridgeInstance.unmapExternalToken(externalTokenAddress);
        assertEq(
            bridgeInstance.external2token(externalTokenAddress), address(0x0)
        );
    }

    function test_fuzz_unmapExternalToken(
        address token,
        bytes32 externalTokenAddress
    )
        public
    {
        vm.assume(token != address(0));
        addToken(token, externalTokenAddress);
        bridgeInstance.unmapExternalToken(externalTokenAddress);
        assertEq(
            bridgeInstance.external2token(externalTokenAddress), address(0x0)
        );
    }

    function test_revertIf_unmapExternalToken_not_authority() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress);
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        bridgeInstance.unmapExternalToken(externalTokenAddress);
        vm.stopPrank();
    }

    function test_revertIf_unmapExternalToken_notMapped() public {
        bytes32 externalTokenAddress = bytes32("sAMB");
        vm.expectRevert(
            abi.encodeWithSelector(
                ITokenManager.TokenNotMapped.selector, externalTokenAddress
            )
        );
        bridgeInstance.unmapExternalToken(externalTokenAddress);
    }

    function test_addTokenWithPaused() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress, false);
    }

    function test_fuzz_addTokenWithPaused(
        address token,
        bytes32 externalTokenAddress,
        bool paused
    )
        public
    {
        vm.assume(token != address(0));
        addToken(token, externalTokenAddress, paused);
    }

    function test_revertIf_addTokenWithPaused_not_authority() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        bridgeInstance.addToken(token, externalTokenAddress, false);
        vm.stopPrank();
    }

    function test_revertIf_addTokenWithPaused_alreadyAdded() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress);
        vm.expectRevert(
            abi.encodeWithSelector(
                ITokenManager.TokenAlreadyAdded.selector, address(wrappedToken)
            )
        );
        bridgeInstance.addToken(token, externalTokenAddress, false);
    }

    function test_tokenPause() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress, false);
        bridgeInstance.pauseToken(token);
        assertEq(bridgeInstance.pausedTokens(token), true);
    }

    function test_revertIf_tokenIsPaused() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress, false);
        bridgeInstance.pauseToken(token);
        vm.expectRevert(
            abi.encodeWithSelector(
                ITokenManager.TokenIsPaused.selector, address(wrappedToken)
            )
        );
        bridgeInstance.pauseToken(token);
    }

    function test_tokenUnpause() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress, false);
        bridgeInstance.pauseToken(token);
        assertEq(bridgeInstance.pausedTokens(token), true);
        bridgeInstance.unpauseToken(token);
        assertEq(bridgeInstance.pausedTokens(token), false);
    }

    function test_revertIf_tokenIsUnpaused() public {
        address token = address(wrappedToken);
        bytes32 externalTokenAddress = bytes32("sAMB");
        addToken(token, externalTokenAddress, false);
        vm.expectRevert(
            abi.encodeWithSelector(
                ITokenManager.TokenNotPaused.selector, address(wrappedToken)
            )
        );
        bridgeInstance.unpauseToken(token);
    }

    function deployBridgedToken(
        bytes32 externalTokenAddress,
        string memory name,
        string memory symbol,
        uint8 decimals
    )
        public
        returns (ERC20Bridged)
    {
        address bridgedToken = bridgeInstance.deployExternalTokenERC20(
            externalTokenAddress, name, symbol, decimals
        );
        ERC20Bridged bridgedTokenInstance = ERC20Bridged(bridgedToken);
        assertEq(bridgedTokenInstance.name(), name);
        assertEq(bridgedTokenInstance.symbol(), symbol);
        assertEq(bridgedTokenInstance.decimals(), decimals);
        assertEq(bridgedTokenInstance.bridge(), address(bridgeInstance));
        return bridgedTokenInstance;
    }

    function test_deployBridgedToken() public {
        bytes32 externalTokenAddress = bytes32("SOLANA");
        string memory name = "Wrapped Solana";
        string memory symbol = "wSOL";
        uint8 decimals = 18;
        deployBridgedToken(externalTokenAddress, name, symbol, decimals);
    }

    function test_fuzz_deployBridgedToken(
        bytes32 externalTokenAddress,
        string memory name,
        string memory symbol,
        uint8 decimals
    )
        public
    {
        deployBridgedToken(externalTokenAddress, name, symbol, decimals);
    }

    function test_revertIf_deployBridgedToken_not_authority() public {
        bytes32 externalTokenAddress = bytes32("SOLANA");
        string memory name = "Wrapped Solana";
        string memory symbol = "wSOL";
        uint8 decimals = 18;
        vm.startPrank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessManaged.AccessManagedUnauthorized.selector, bob
            )
        );
        bridgeInstance.deployExternalTokenERC20(
            externalTokenAddress, name, symbol, decimals
        );
        vm.stopPrank();
    }

    function test_revertIf_deployBridgedToken_alreadyMapped() public {
        bytes32 externalTokenAddress = bytes32("SOLANA");
        addToken(address(wrappedToken), externalTokenAddress);
        string memory name = "Wrapped Solana";
        string memory symbol = "wSOL";
        uint8 decimals = 18;
        vm.expectRevert(
            abi.encodeWithSelector(
                ITokenManager.TokenAlreadyMapped.selector, externalTokenAddress
            )
        );
        bridgeInstance.deployExternalTokenERC20(
            externalTokenAddress, name, symbol, decimals
        );
    }

}
