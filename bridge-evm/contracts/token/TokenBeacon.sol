// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;
import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";

contract TokenBeacon is UpgradeableBeacon {
	constructor(address owner_,address implementation_) UpgradeableBeacon(implementation_, owner_) {}
}