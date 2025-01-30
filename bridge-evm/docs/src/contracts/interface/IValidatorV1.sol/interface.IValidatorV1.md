# IValidatorV1
[Git Source](https://github.com/ambrosus/token-bridge/blob/993622e8c41d2a383e3259906b546417f92b844e/contracts/interface/IValidatorV1.sol)


## Functions
### addValidator

Add a new validator to the list


```solidity
function addValidator(address validator) external returns (bool added);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`validator`|`address`|address of the validator|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`added`|`bool`|true if the validator was added|


### removeValidator

Remove a validator from the list


```solidity
function removeValidator(address validator) external returns (bool removed);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`validator`|`address`|address of the validator|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`removed`|`bool`|true if the validator was removed|


### isValidator

Check if an address is a validator


```solidity
function isValidator(address validator)
    external
    view
    returns (bool isValidator);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`validator`|`address`|address of the validator|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`isValidator`|`bool`|true if the address is a validator|


## Errors
### InvalidSignatureLength

```solidity
error InvalidSignatureLength(uint256 length);
```

### SignatureCountMismatch

```solidity
error SignatureCountMismatch(uint256 count, uint256 required);
```

