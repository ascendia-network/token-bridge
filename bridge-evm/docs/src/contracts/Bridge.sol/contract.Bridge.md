# Bridge
[Git Source](https://github.com/ambrosus/token-bridge/blob/993622e8c41d2a383e3259906b546417f92b844e/contracts/Bridge.sol)

**Inherits:**
[BridgeUpgradeable](/contracts/upgradeable/BridgeUpgradeable.sol/abstract.BridgeUpgradeable.md)


## Functions
### initialize

Initialize the contract with the given parameters


```solidity
function initialize(
    address authority_,
    address SAMB_,
    IValidation validator_,
    address payable feeReceiver_,
    uint256 nativeSendAmount_
)
    public
    initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`authority_`|`address`|address of the authority contract [AccessManager](https://docs.openzeppelin.com/contracts/5.x/access-control#access-management)|
|`SAMB_`|`address`|address of the Wrapped token contract|
|`validator_`|`IValidation`|address of the validator contract|
|`feeReceiver_`|`address payable`|address of the fee receiver|
|`nativeSendAmount_`|`uint256`|amount of native currency to send to the receiver in destination chain (here) if needed|


