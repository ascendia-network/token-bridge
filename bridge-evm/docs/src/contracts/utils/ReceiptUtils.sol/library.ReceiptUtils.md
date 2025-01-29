# ReceiptUtils
[Git Source](https://github.com/ambrosus/token-bridge/blob/08ecfb54703230310910522cefe4e0786efed918/contracts/utils/ReceiptUtils.sol)


## Functions
### toHash

Shortcut to convert receipt to hash

*using [toEthSignedMessageHash](https://docs.openzeppelin.com/contracts/5.x/api/utils#MessageHashUtils-toEthSignedMessageHash-bytes32-) from OpenZeppelin's MessageHashUtils*


```solidity
function toHash(IBridgeTypes.Receipt calldata receipt)
    internal
    pure
    returns (bytes32 hash);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`receipt`|`IBridgeTypes.Receipt`|receipt to convert|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`hash`|`bytes32`|converted|


### toEthSignedMessageHash

Convert receipt to hash via toEthSignedMessageHash

*using [toEthSignedMessageHash](https://docs.openzeppelin.com/contracts/5.x/api/utils#MessageHashUtils-toEthSignedMessageHash-bytes32-) from OpenZeppelin's MessageHashUtils*


```solidity
function toEthSignedMessageHash(IBridgeTypes.Receipt calldata receipt)
    internal
    pure
    returns (bytes32 hash);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`receipt`|`IBridgeTypes.Receipt`|receipt to convert|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`hash`|`bytes32`|converted|


