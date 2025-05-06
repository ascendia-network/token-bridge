# BridgeFlags
[Git Source](https://github.com/ambrosus/token-bridge/blob/552fd0953a1932ae8ea9555e10159a131960dfef/contracts/interface/BridgeTypes.sol)

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


