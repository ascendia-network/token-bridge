// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IWrapped is IERC20 {

    /// Deposit tokens to the contract (a.k.a wrap tokens)
    /// @dev converts msg.value amount to ERC20 tokens with the same amount
    function deposit() external payable;

    /// Withdraw tokens from the contract (a.k.a unwrap tokens)
    /// @param amount amount of tokens to withdraw
    /// @dev converts ERC20 tokens to native currency with the same amount
    function withdraw(uint256 amount) external;

}
