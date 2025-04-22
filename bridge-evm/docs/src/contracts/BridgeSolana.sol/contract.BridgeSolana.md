# BridgeSolana
[Git Source](https://github.com/ambrosus/token-bridge/blob/552fd0953a1932ae8ea9555e10159a131960dfef/contracts/BridgeSolana.sol)

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


### generateReceipt

Generate the receipt data

*For Solana, the receipt is generated adding the nonce of the recipient address to the data field as a uint64*


```solidity
function generateReceipt(
    address sender,
    bytes32 recipient,
    uint256 amountTo,
    SendPayload calldata payload,
    ExternalToken memory externalToken_
) internal override returns (FullReceipt memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|address of the sender|
|`recipient`|`bytes32`|address of the recipient on the other chain|
|`amountTo`|`uint256`|amount of tokens to receive|
|`payload`|`SendPayload`|send payload|
|`externalToken_`|`ExternalToken`|external token data|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`FullReceipt`|receipt receipt data|


