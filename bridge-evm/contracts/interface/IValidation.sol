// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;

interface IValidation {
  /// Check if the address is a validator
  /// @param validator address of the validator
  /// @return true if the address is a validator
  function isValidator(address validator) external view returns (bool);
  /// Enabling the address as validator
  /// @param validator address of the validator
  /// @return true if the validator was added
  function addValidator(address validator) external returns (bool);
  /// Disabling the address as validator
  /// @param validator address of the validator
  /// @return true if the validator was deleted
  function deleteValidator(address validator) external returns (bool);
}
