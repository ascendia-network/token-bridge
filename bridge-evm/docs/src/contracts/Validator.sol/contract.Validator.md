# Validator
[Git Source](https://github.com/ambrosus/token-bridge/blob/91bb52a526c0f112baf68a5b9e3a3c70d76246d0/contracts/Validator.sol)

**Inherits:**
[ValidatorUpgradeable](/contracts/upgradeable/ValidatorUpgradeable.sol/abstract.ValidatorUpgradeable.md)


## Functions
### initialize

Initialize the contract with the given parameters


```solidity
function initialize(
    address authority_,
    address[] calldata validators_,
    address payloadSigner_,
    uint256 feeValidityWindow_
)
    public
    initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`authority_`|`address`|address of the authority contract [AccessManager](https://docs.openzeppelin.com/contracts/5.x/access-control#access-management)|
|`validators_`|`address[]`|address of the validator contract|
|`payloadSigner_`|`address`|address of the payload signer|
|`feeValidityWindow_`|`uint256`|fee validity window|


