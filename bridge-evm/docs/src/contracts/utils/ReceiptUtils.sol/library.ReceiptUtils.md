# ReceiptUtils
[Git Source](https://github.com/ambrosus/token-bridge/blob/1106b61cbc37ad86299178c6d334722a2ad64d7d/contracts/utils/ReceiptUtils.sol)


## Functions
### asMini

Convert full receipt to mini receipt


```solidity
function asMini(BridgeTypes.FullReceipt memory receipt)
    internal
    pure
    returns (BridgeTypes.MiniReceipt memory mini);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`receipt`|`BridgeTypes.FullReceipt`|receipt to convert|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`mini`|`BridgeTypes.MiniReceipt`|receipt converted|


### toHash

Shortcut to convert receipt to hash

*using [toEthSignedMessageHash](https://docs.openzeppelin.com/contracts/5.x/api/utils#MessageHashUtils-toEthSignedMessageHash-bytes32-) from OpenZeppelin's MessageHashUtils*


```solidity
function toHash(BridgeTypes.FullReceipt memory receipt)
    internal
    pure
    returns (bytes32 hash);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`receipt`|`BridgeTypes.FullReceipt`|receipt to convert|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`hash`|`bytes32`|converted|


### toHash

Shortcut to convert receipt to hash

*using [toEthSignedMessageHash](https://docs.openzeppelin.com/contracts/5.x/api/utils#MessageHashUtils-toEthSignedMessageHash-bytes32-) from OpenZeppelin's MessageHashUtils*


```solidity
function toHash(BridgeTypes.MiniReceipt memory receipt)
    internal
    pure
    returns (bytes32 hash);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`receipt`|`BridgeTypes.MiniReceipt`|receipt to convert|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`hash`|`bytes32`|converted|


### toEthSignedMessageHash

Convert receipt to hash via toEthSignedMessageHash

*using [toEthSignedMessageHash](https://docs.openzeppelin.com/contracts/5.x/api/utils#MessageHashUtils-toEthSignedMessageHash-bytes32-) from OpenZeppelin's MessageHashUtils*


```solidity
function toEthSignedMessageHash(BridgeTypes.MiniReceipt memory receipt)
    internal
    pure
    returns (bytes32 hash);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`receipt`|`BridgeTypes.MiniReceipt`|receipt to convert|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`hash`|`bytes32`|converted|


