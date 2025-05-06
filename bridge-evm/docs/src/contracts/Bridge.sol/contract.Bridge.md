# Bridge
[Git Source](https://github.com/ambrosus/token-bridge/blob/552fd0953a1932ae8ea9555e10159a131960dfef/contracts/Bridge.sol)

**Inherits:**
[BridgeUpgradeable](/contracts/upgradeable/BridgeUpgradeable.sol/abstract.BridgeUpgradeable.md)


## Functions
### initialize

Initialize the contract with the given parameters


```solidity
function initialize(
    address authority_,
    address tokenBeacon_,
    address SAMB_,
    IValidation validator_,
    address payable feeReceiver_,
    uint256 nativeSendAmount_
) public initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`authority_`|`address`|address of the authority contract [AccessManager](https://docs.openzeppelin.com/contracts/5.x/access-control#access-management)|
|`tokenBeacon_`|`address`||
|`SAMB_`|`address`|address of the Wrapped token contract|
|`validator_`|`IValidation`|address of the validator contract|
|`feeReceiver_`|`address payable`|address of the fee receiver|
|`nativeSendAmount_`|`uint256`|amount of native currency to send to the receiver in destination chain (here) if needed|


