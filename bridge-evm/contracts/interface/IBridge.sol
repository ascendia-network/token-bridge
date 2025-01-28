// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;

interface IBridge {

  /// Emits when tokens are locked in the contract
  event TokenLocked(
    Receipt receipt
  );

  event TokenLockCanceled(
    Receipt receipt
  );

  /// Emits when tokens are claimed from the contract
  event TokenUnlocked(
    Receipt receipt
  );

  enum ReceiptStatus {
    Undefined, // 0
    Locked, // 1
    Unlocked, // 2
    Canceled // 3
  }

  /// Bridge transaction receipt structure that is used for signing and validation
  struct Receipt {
        bytes32 from; // source address (bytes32 because of cross-chain compatibility)
        bytes32 to; // destination address (bytes32 because of cross-chain compatibility)
        bytes32 tokenAddress; // source token address (bytes32 because of cross-chain compatibility)
        uint256 amount; // amount of tokens sent
        uint256 chainFrom; // chain id of the source chain
        uint256 chainTo; // chain id of the destination chain
        uint256 nonce; // transaction number (counter of outgoing transactions of source chain)
  }

  /// Fee structure that is used for signing and validation
  struct Fee {
    bytes32 tokenAddress; // address of the fee token
    uint256 amountToSend; // amount of the tokens to be sent
    uint256 amount; // amount of the fee
    uint256 timestamp; // timestamp of the fee was generated
  }

  function MPCAddress() external view returns (address mpcAddress);

  function setMPCAddress(address _MPCAddress) external;

  function feeSigner() external view returns (address feeSigner);

  function setFeeSigner(address _feeSigner) external;

  /// Validate the fee amount
  /// @return true if the fee is valid
  function isValidFee(
    Fee calldata fee, 
    bytes calldata signature
  ) external view returns (bool);

  /// Get the fee validity window in seconds. If the fee is older than this window, it is considered invalid and should be regenerated.
  /// @return validityWindow seconds of the fee validity window
  function feeValidityWindow() external view returns (uint256 validityWindow);

  /// Get the last nonce of the chain transactions
  /// @return last nonce that was used
  function lastNonce() external view returns (uint256);

  /// Send tokens to another chain
  /// @dev This function should be called by the user who wants to send tokens to another chain. 
  /// It transfers the tokens to the contract, and validates fee amount that was sent and emits a `TokensLocked` event.
  /// The function should be payable to receive the fee in native currency.
  /// @param tokenAddress address of the token contract to send
  /// @param recipient address of the recipient on the other chain (string because of cross-chain compatibility)
  /// @param amount amount of tokens to send
  /// @param fee amount of bridge fee
  /// @param feeSignature signature of the fee values to validate amount validity
  /// @return receipt data of the transaction which will be signed and sent to the other chain
  function send(
    bytes32 tokenAddress, 
    bytes32 recipient, 
    uint256 amount, 
    uint256 chainTo,
    Fee calldata fee, 
    bytes calldata feeSignature
  ) external payable returns (Receipt memory receipt);

  /// Cancel the transaction by nonce
  /// @dev This function should be called by the user who wants to cancel the transaction.
  /// It requires that the transaction was not claimed on the destination chain and be older than 5x of submission window.
  /// If cancellation is successful, it emits a `TokenLockCanceled` event.
  /// If cancellation performed by admin, it doesn't require a signature or submission window.
  /// @param nonce nonce of the transaction to cancel
  /// @param signature MPC signature of Receipt to validate the cancellation
  /// @return success true if the transaction was canceled
  function cancel(
    uint256 nonce,
    bytes calldata signature
  ) external returns (bool success);

  /// Claim tokens from another chain
  /// @dev This function should be called by the user who wants to claim tokens from another chain. 
  /// It claims the tokens from the contract, and emits a `TokenUnlocked` event.
  /// @param receipt Receipt of the transaction to claim
  /// @param signature MPC signature of the payload
  /// @return success true if the claim was successful
  function claim(
    Receipt calldata receipt, 
    bytes calldata signature
  ) external returns (bool success);

  function validateClaims(
    uint256[] calldata nonces,
    bytes calldata signature
  ) external returns (bool success);
}