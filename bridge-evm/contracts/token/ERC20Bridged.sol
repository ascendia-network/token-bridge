// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {AccessManagedUpgradeable} from
    "@openzeppelin/contracts-upgradeable/access/manager/AccessManagedUpgradeable.sol";

import {Initializable} from
    "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC20Upgradeable} from
    "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PermitUpgradeable} from
    "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";

contract ERC20Bridged is
    Initializable,
    AccessManagedUpgradeable,
    ERC20Upgradeable,
    ERC20PermitUpgradeable
{

    struct BridgeEntry {
        /// @dev The address of the bridge contract
        bool active;
        /// @dev The amount of tokens to be operated
        uint256 amountOfTokens;
    }
    /// @custom:storage-location erc7201:bridged.storage.ERC20Additional

    struct BridgedERC20Storage {
        /// @dev The number of decimals for the token
        uint8 _decimals;
        /// @dev The address of the bridge contract
        mapping(address => BridgeEntry) _bridges;
        /// @dev The blacklist of addresses (blacklisted addresses cannot send or receive tokens)
        mapping(address => bool) _blacklist;
    }

    /// @dev Emitted when an address is blacklisted
    error Blacklisted(address account);

    /// @dev Emitted when the not bridge address is used
    error NotABridge(address account);
    /// @dev Emitted when not enough tokens are available
    error InsufficientBridgeBalance(uint256 balance, uint256 amountRequired);

    // keccak256(abi.encode(uint256(keccak256("bridged.storage.ERC20Additional")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant ERC20AdditionalStorageLocation =
        0xb5ac4c0d6c28de524e1dbc51411a2e707582c4bdbfe893edf60b98f392fe9600;

    function _getERC20AdditionalStorage()
        private
        pure
        returns (BridgedERC20Storage storage $)
    {
        assembly {
            $.slot := ERC20AdditionalStorageLocation
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address authority_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address bridge_
    ) public initializer {
        __ERC20Bridged_init(authority_, name_, symbol_, decimals_, bridge_);
    }

    function __ERC20Bridged_init(
        address authority_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address bridge_
    ) internal onlyInitializing {
        __ERC20Bridged_init_unchained(
            authority_, name_, symbol_, decimals_, bridge_
        );
    }

    function __ERC20Bridged_init_unchained(
        address authority_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address bridge_
    ) internal onlyInitializing {
        __AccessManaged_init(authority_);
        __ERC20_init(name_, symbol_);
        __ERC20Permit_init(name_);
        BridgedERC20Storage storage $ = _getERC20AdditionalStorage();
        $._decimals = decimals_;
        if (bridge_ != address(0)) {
            $._bridges[bridge_] = BridgeEntry({active: true, amountOfTokens: 0});
        }
    }

    /**
     * @dev Check is the address blacklisted.
     */
    modifier notInBlacklist(
        address account
    ) {
        BridgedERC20Storage storage $ = _getERC20AdditionalStorage();
        if ($._blacklist[account]) {
            revert Blacklisted(account);
        }
        _;
    }

    /**
     * @dev Add an address to the bridge list
     * @param account the address to add to the bridge list
     */
    function addBridge(
        address account
    ) public restricted {
        addBridge(account, 0);
    }

    /**
     * @dev Add an address to the bridge list
     * @param account the address to add to the bridge list
     * @param amount the amount of tokens to be operated
     * @notice This function is used to set the amount of tokens already operated by the bridge
     */
    function addBridge(address account, uint256 amount) public restricted {
        BridgedERC20Storage storage $ = _getERC20AdditionalStorage();
        if (account == address(0)) {
            revert NotABridge(account);
        }
        require(
            $._bridges[account].active == false,
            "Bridge already exists"
        );
        $._bridges[account] =
            BridgeEntry({active: true, amountOfTokens: amount});
    }
    /**
     * @dev Remove an address from the bridge list
     * @param account the address to remove from the bridge list
     */

    function removeBridge(
        address account
    ) public restricted {
        BridgedERC20Storage storage $ = _getERC20AdditionalStorage();
        $._bridges[account].active = false;
    }

    /**
     * @dev Add an address to the blacklist
     * @param account the address to add to the blacklist
     */
    function addBlacklist(
        address account
    ) public restricted {
        BridgedERC20Storage storage $ = _getERC20AdditionalStorage();
        $._blacklist[account] = true;
    }

    /**
     * @dev Remove an address from the blacklist
     * @param account the address to remove from the blacklist
     */
    function removeBlacklist(
        address account
    ) public restricted {
        BridgedERC20Storage storage $ = _getERC20AdditionalStorage();
        delete $._blacklist[account];
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     * @return decimals_ the number of decimals of the token
     */
    function decimals() public view override returns (uint8 decimals_) {
        BridgedERC20Storage storage $ = _getERC20AdditionalStorage();
        return $._decimals;
    }
    /**
     * @dev Returns the amount of tokens that the bridge has.
     * @param candidate the address of the bridge
     * @return amount_ the amount of tokens that the bridge has
     */

    function bridgeBalanceOf(
        address candidate
    ) public view returns (uint256 amount_) {
        return _getOperationAmount(candidate);
    }

    /**
     * @notice Bridge entry, a public view contract function.
     * @param candidate The candidate address.
     * @return entry A BridgeEntry value.
     */
    function bridgeEntry(
        address candidate
    ) public view returns (BridgeEntry memory entry) {
        BridgedERC20Storage storage $ = _getERC20AdditionalStorage();
        return $._bridges[candidate];
    }

    /**
     * @dev Transfers a `value` amount of tokens from `from` to `to`, or alternatively mints (or burns) if `from`
     * (or `to`) is the `bridge` address. (This is the only difference from the {ERC20} implementation.)
     *
     * Emits a {Transfer} event.
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override notInBlacklist(from) notInBlacklist(to) {
        // Apply the accounting logic for the bridge
        // If the sender is a bridge, we need to mint tokens and add them to operating balance
        // If the recipient is a bridge, we need to burn tokens and remove them from operating balance
        // If both sender and recipient is a bridge or address(0), we need to revert
        BridgedERC20Storage storage $ = _getERC20AdditionalStorage();
        if (
            $._bridges[from].active
                && ($._bridges[to].active || to == address(0))
        ) {
            // sender is bridge and recipient is bridge or address(0)
            // this behavior is not allowed
            revert ERC20InvalidReceiver(to);
        } else if ($._bridges[from].active) {
            // sender is bridge
            // user transfer tokens to ambrosus => need to mint it
            $._bridges[from].amountOfTokens += value;
            from = address(0);
        } else if ($._bridges[to].active) {
            // recipient is bridge
            // user withdraw tokens from ambrosus => need to burn it
            // user burn tokens; side bridge must have enough tokens to send
            if ($._bridges[to].amountOfTokens < value) {
                revert InsufficientBridgeBalance(
                    $._bridges[to].amountOfTokens, value
                );
            }
            $._bridges[to].amountOfTokens -= value;
            to = address(0);
        }
        // perform the transfer as usual
        super._update(from, to, value);
    }

    function _getOperationAmount(
        address candidate
    ) private view returns (uint256 amount_) {
        BridgedERC20Storage storage $ = _getERC20AdditionalStorage();
        if (!$._bridges[candidate].active) {
            revert NotABridge(candidate);
        }
        return $._bridges[candidate].amountOfTokens;
    }

}
