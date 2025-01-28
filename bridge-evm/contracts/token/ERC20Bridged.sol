// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";


contract ERC20Bridged is ERC20Permit {
    uint8 private _decimals;
    address private _bridgeAddress;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address bridge_
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        _decimals = decimals_;
        _bridgeAddress = bridge_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function bridge() public view returns (address) {
        return _bridgeAddress;
    }

    /**
     * @dev Transfers a `value` amount of tokens from `from` to `to`, or alternatively mints (or burns) if `from`
     * (or `to`) is the zero address. All customizations to transfers, mints, and burns should be done by overriding
     * this function.
     *
     * Emits a {Transfer} event.
     */
    function _update(address from, address to, uint256 value) internal override {
        // If token is sent from the bridge, mint it
        if (from == _bridgeAddress) {
          if(to == address(0)) {
            revert ERC20InvalidReceiver(address(0));
          }
          super._update(address(0), to, value);
        }
        // If the token is sent to the bridge, burn it
        else if (to == _bridgeAddress) {
          super._update(from, address(0), value);
        }
        else {
          super._update(from, to, value);
        }
    }
}
