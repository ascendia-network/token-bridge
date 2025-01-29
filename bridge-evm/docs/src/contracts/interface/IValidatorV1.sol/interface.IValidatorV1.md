# IValidatorV1
[Git Source](https://github.com/ambrosus/token-bridge/blob/08ecfb54703230310910522cefe4e0786efed918/contracts/interface/IValidatorV1.sol)


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


