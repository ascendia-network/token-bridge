// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;

interface IValidatorV1 {

    /// Add a new validator to the list
    /// @param validator address of the validator
    /// @return added true if the validator was added
    function addValidator(address validator) external returns (bool added);

    /// Remove a validator from the list
    /// @param validator address of the validator
    /// @return removed true if the validator was removed
    function removeValidator(address validator)
        external
        returns (bool removed);

}
