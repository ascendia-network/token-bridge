// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/utils/Strings.sol";


library AddressUtils {
    using Strings for string;
    /// Convert address to bytes32 using big-endian byte order
    /// @param value address value to convert
    /// @return address converted
    function toAddressBE(bytes32 value) internal pure returns (address) {
        return address(uint160(uint256(value)));
    }

    /// Convert bytes32 to address using little-endian byte order
    /// @param value bytes32 value to convert
    /// @return address converted
    function toAddressLE(bytes32 value) internal pure returns (address) {
        return address(uint160(bytes20(value)));
    }

    /// Convert bytes32 to address
    /// @param value bytes32 value to convert
    /// @param le true if the value is in little-endian byte order
    /// @return address converted
    function toAddress(bytes32 value, bool le) internal pure returns (address) {
        return le ? toAddressLE(value) : toAddressBE(value);
    }

    /// Convert bytes32 to address using big-endian byte order
    /// @param value bytes32 value to convert
    /// @return address converted
    function toAddress(bytes32 value) internal pure returns (address) {
        return toAddress(value, false);
    }

    function toAddress(
        string memory _address
    ) public pure returns (address) {
        return _address.parseAddress();
    }
}