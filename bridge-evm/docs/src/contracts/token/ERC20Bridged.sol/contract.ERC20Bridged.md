# ERC20Bridged
[Git Source](https://github.com/ambrosus/token-bridge/blob/409fc4f08d5e15b395d86c45cf8a1866a217b4cf/contracts/token/ERC20Bridged.sol)

**Inherits:**
Initializable, AccessManagedUpgradeable, ERC20Upgradeable, ERC20PermitUpgradeable


## State Variables
### ERC20AdditionalStorageLocation

```solidity
bytes32 private constant ERC20AdditionalStorageLocation =
    0xb5ac4c0d6c28de524e1dbc51411a2e707582c4bdbfe893edf60b98f392fe9600;
```


## Functions
### _getERC20AdditionalStorage


```solidity
function _getERC20AdditionalStorage()
    private
    pure
    returns (BridgedERC20Storage storage $);
```

### constructor

**Note:**
oz-upgrades-unsafe-allow: constructor


```solidity
constructor();
```

### initialize


```solidity
function initialize(
    address authority_,
    string memory name_,
    string memory symbol_,
    uint8 decimals_,
    address bridge_
) public initializer;
```

### __ERC20Bridged_init


```solidity
function __ERC20Bridged_init(
    address authority_,
    string memory name_,
    string memory symbol_,
    uint8 decimals_,
    address bridge_
) internal onlyInitializing;
```

### __ERC20Bridged_init_unchained


```solidity
function __ERC20Bridged_init_unchained(
    address authority_,
    string memory name_,
    string memory symbol_,
    uint8 decimals_,
    address bridge_
) internal onlyInitializing;
```

### notInBlacklist

*Check is the address blacklisted.*


```solidity
modifier notInBlacklist(
    address account
);
```

### addBridge

*Add an address to the bridge list*


```solidity
function addBridge(
    address account
) public restricted;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`account`|`address`|the address to add to the bridge list|


### addBridge

This function is used to set the amount of tokens already operated by the bridge

*Add an address to the bridge list*


```solidity
function addBridge(address account, uint256 amount) public restricted;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`account`|`address`|the address to add to the bridge list|
|`amount`|`uint256`|the amount of tokens to be operated|


### removeBridge

*Remove an address from the bridge list*


```solidity
function removeBridge(
    address account
) public restricted;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`account`|`address`|the address to remove from the bridge list|


### addBlacklist

*Add an address to the blacklist*


```solidity
function addBlacklist(
    address account
) public restricted;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`account`|`address`|the address to add to the blacklist|


### removeBlacklist

*Remove an address from the blacklist*


```solidity
function removeBlacklist(
    address account
) public restricted;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`account`|`address`|the address to remove from the blacklist|


### decimals

*Returns the number of decimals used to get its user representation.
For example, if `decimals` equals `2`, a balance of `505` tokens should
be displayed to a user as `5.05` (`505 / 10 ** 2`).
NOTE: This information is only used for _display_ purposes: it in
no way affects any of the arithmetic of the contract, including
[IERC20-balanceOf](/lib/forge-std/src/interfaces/IERC1155.sol/interface.IERC1155.md#balanceof) and {IERC20-transfer}.*


```solidity
function decimals() public view override returns (uint8 decimals_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`decimals_`|`uint8`|the number of decimals of the token|


### bridgeBalanceOf

*Returns the amount of tokens that the bridge has.*


```solidity
function bridgeBalanceOf(
    address candidate
) public view returns (uint256 amount_);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`candidate`|`address`|the address of the bridge|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount_`|`uint256`|the amount of tokens that the bridge has|


### bridgeEntry

Bridge entry, a public view contract function.


```solidity
function bridgeEntry(
    address candidate
) public view returns (BridgeEntry memory entry);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`candidate`|`address`|The candidate address.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`entry`|`BridgeEntry`|A BridgeEntry value.|


### _update

*Transfers a `value` amount of tokens from `from` to `to`, or alternatively mints (or burns) if `from`
(or `to`) is the `bridge` address. (This is the only difference from the {ERC20} implementation.)
Emits a {Transfer} event.*


```solidity
function _update(
    address from,
    address to,
    uint256 value
) internal override notInBlacklist(from) notInBlacklist(to);
```

### _getOperationAmount


```solidity
function _getOperationAmount(
    address candidate
) private view returns (uint256 amount_);
```

## Errors
### Blacklisted
*Emitted when an address is blacklisted*


```solidity
error Blacklisted(address account);
```

### NotABridge
*Emitted when the not bridge address is used*


```solidity
error NotABridge(address account);
```

### InsufficientBridgeBalance
*Emitted when not enough tokens are available*


```solidity
error InsufficientBridgeBalance(uint256 balance, uint256 amountRequired);
```

## Structs
### BridgeEntry

```solidity
struct BridgeEntry {
    bool active;
    uint256 amountOfTokens;
}
```

### BridgedERC20Storage
**Note:**
storage-location: erc7201:bridged.storage.ERC20Additional


```solidity
struct BridgedERC20Storage {
    uint8 _decimals;
    mapping(address => BridgeEntry) _bridges;
    mapping(address => bool) _blacklist;
}
```

