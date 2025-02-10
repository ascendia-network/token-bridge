# BridgeFlags
[Git Source](https://github.com/ambrosus/token-bridge/blob/91bb52a526c0f112baf68a5b9e3a3c70d76246d0/contracts/interface/BridgeTypes.sol)

*Flags for the bridge operations*


## State Variables
### SENDER_IS_TXORIGIN
*Sender is tx.origin (not msg.sender)*


```solidity
uint256 constant SENDER_IS_TXORIGIN = 1 << 0;
```


### SEND_WITH_PERMIT
*Should send with permit action*


```solidity
uint256 constant SEND_WITH_PERMIT = 1 << 1;
```


### SHOULD_WRAP
*Should wrap the tokens before sending*


```solidity
uint256 constant SHOULD_WRAP = 1 << 2;
```


### SHOULD_UNWRAP
*Should unwrap the tokens after receiving*


```solidity
uint256 constant SHOULD_UNWRAP = 1 << 65;
```


### SEND_NATIVE_TO_RECEIVER
*Should send the additional native tokens to the receiver on the other chain in exchange of higher fee amount*


```solidity
uint256 constant SEND_NATIVE_TO_RECEIVER = 1 << 66;
```


### SHOULD_RESTAKE
*Should restake the received tokens*


```solidity
uint256 constant SHOULD_RESTAKE = 1 << 67;
```


