// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {IERC20Errors} from
    "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

import {ERC20Bridged} from "../contracts/token/ERC20Bridged.sol";
import {TokenBeacon} from "../contracts/token/TokenBeacon.sol";
import {AccessManager} from
    "@openzeppelin/contracts/access/manager/AccessManager.sol";
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

contract ERC20BridgedTest is Test {

    AccessManager authority;

    ERC20Bridged token;

    address fakeBridge = address(0xB5149e);
    address alice = address(0xA11ce);
    address bob = address(0xB0b);

    function setUp() public {
        authority = new AccessManager(address(this));
        string memory name = "Test";
        string memory symbol = "TST";
        uint8 decimals = 18;
        address bridge = fakeBridge;
        address implementation = address(new ERC20Bridged());
        TokenBeacon beacon = new TokenBeacon(address(this), implementation);
        bytes memory initData = abi.encodeWithSignature("initialize(address,string,string,uint8,address)", address(this), name, symbol, decimals, bridge);
        address tokenBeacon = address(beacon);
        token = ERC20Bridged(address(new BeaconProxy(tokenBeacon, initData)));
    }

    function test_constructor() public view {
        assertEq(token.name(), "Test");
        assertEq(token.symbol(), "TST");
        assertEq(token.decimals(), 18);
        assertEq(token.bridge(), fakeBridge);
    }

    function test_fuzz_send_from_bridge(uint256 amount, address to) public {
        vm.assume(to != address(0) && amount > 0 && to != fakeBridge);
        vm.startPrank(fakeBridge);
        token.transfer(to, amount);
        vm.stopPrank();
        assertEq(token.balanceOf(to), amount);
        assertEq(token.totalSupply(), amount);
    }

    function test_revertIf_send_from_bridge_to_bridge() public {
        vm.startPrank(fakeBridge);
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InvalidReceiver.selector, fakeBridge
            )
        );
        token.transfer(fakeBridge, 100);
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InvalidReceiver.selector, address(0)
            )
        );
        token.transfer(address(0), 100);
    }

    function test_fuzz_send_to_bridge(
        uint256 initialBalance,
        address from,
        uint256 amount
    )
        public
    {
        vm.assume(
            from != address(0) && amount <= initialBalance && from != fakeBridge
        );
        vm.startPrank(fakeBridge);
        token.transfer(from, initialBalance);
        vm.stopPrank();
        assertEq(token.totalSupply(), initialBalance);
        vm.startPrank(from);
        token.transfer(fakeBridge, amount);
        vm.stopPrank();
        assertEq(token.balanceOf(from), initialBalance - amount);
        assertEq(token.totalSupply(), initialBalance - amount);
    }

    function test_fuzz_send_user_to_user(
        uint256 initialBalance,
        address from,
        address to,
        uint256 amount
    )
        public
    {
        vm.assume(
            from != to && from != address(0) && to != address(0)
                && amount <= initialBalance && from != fakeBridge
                && to != fakeBridge
        );
        vm.startPrank(fakeBridge);
        token.transfer(from, initialBalance);
        vm.stopPrank();
        assertEq(token.totalSupply(), initialBalance);
        vm.startPrank(from);
        token.transfer(to, amount);
        vm.stopPrank();
        assertEq(token.balanceOf(from), initialBalance - amount);
        assertEq(token.balanceOf(to), amount);
        assertEq(token.totalSupply(), initialBalance);
    }

}
