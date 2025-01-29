// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../interface/ITokenManager.sol";
import "../token/ERC20Bridged.sol";
import "../interface/IWrapped.sol";

abstract contract TokenManagerUpgradeable is ITokenManager, Initializable {
    /// @custom:storage-location erc7201:airdao.bridge.token-manager.storage
    struct TokenManagerStorage {
        mapping(address => bool) bridgableTokens;
        mapping(bytes32 => address) external2token;
        mapping(address => bool) unpausedTokens; // paused tokens where 0 is paused and 1 is unpaused
        address bridge;
        address SAMB;
    }

    // keccak256(abi.encode(uint256(keccak256("airdao.bridge.token-manager.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant TokenManagerStorageLocation =
        0x2d15676fe9c8ae7133aa3a07c866790ab075f046651b2191e662a4edad09af00;

    function _getTokenManagerStorage()
        private
        pure
        returns (TokenManagerStorage storage $)
    {
        assembly {
            $.slot := TokenManagerStorageLocation
        }
    }

    function __TokenManager_init(
        address bridge_,
        address SAMB
    ) internal onlyInitializing {
        __TokenManager_init_unchained(bridge_, SAMB);
    }

    function __TokenManager_init_unchained(
        address bridge_,
        address SAMB
    ) internal onlyInitializing {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        $.bridge = bridge_;
        $.SAMB = SAMB;
    }

    /// @inheritdoc ITokenManager
    function addToken(
        address token,
        bytes32 externalTokenAddress
    ) external virtual override returns (bool success) {
        return addToken(token, externalTokenAddress, true);
    }

    /// Add token to the bridge
    /// @param token address of the token
    /// @param externalTokenAddress external token address
    /// @param paused true if the token should be paused at the start
    /// @return success true if the token was added successfully
    function addToken(
        address token,
        bytes32 externalTokenAddress,
        bool paused
    ) public virtual returns (bool success) {
        bool res = _addToken(token, externalTokenAddress);
        if (paused) res = res && _pauseToken(token);
        return res;
    }
    /// @inheritdoc ITokenManager
    function mapExternalToken(
        bytes32 externalTokenAddress,
        address token
    ) public virtual returns (bool success) {
        return _mapToken(externalTokenAddress, token);
    }

    /// @inheritdoc ITokenManager
    function pauseToken(
        address token
    ) public virtual override returns (bool success) {
        return _pauseToken(token);
    }

    /// @inheritdoc ITokenManager
    function unpauseToken(
        address token
    ) public virtual override returns (bool success) {
        return _unpauseToken(token);
    }

    /// @inheritdoc ITokenManager
    function removeToken(
        address token,
        bytes32 externalTokenAddress
    ) public virtual override returns (bool success) {
        return _removeToken(token, externalTokenAddress);
    }

    /// @inheritdoc ITokenManager
    function deployExternalTokenERC20(
        bytes32 externalTokenAddress,
        string calldata name,
        string calldata symbol,
        uint8 decimals
    ) public virtual override returns (address token) {
        return
            _deployExternalTokenERC20(
                externalTokenAddress,
                name,
                symbol,
                decimals
            );
    }

    modifier isNotPaused(address token) {
        if (pausedTokens(token)) {
            revert TokenIsPaused(token);
        }
        _;
    }

    function _wrap(uint256 amount) internal {
        return
            IWrapped(_getTokenManagerStorage().SAMB).deposit{value: amount}();
    }

    function _unwrap(uint256 amount) internal {
        return IWrapped(_getTokenManagerStorage().SAMB).withdraw(amount);
    }

    // Needed to receive AMB from wrapped SAMB
    receive() external payable {}

    /// @inheritdoc ITokenManager
    function bridgableTokens(
        address token
    ) public view override returns (bool isBridgable) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        return $.bridgableTokens[token];
    }

    // /// @inheritdoc ITokenManager
    // function token2external(
    //     address token
    // ) public view override returns (bytes32 externalTokenAddress) {
    //     TokenManagerStorage storage $ = _getTokenManagerStorage();
    //     return $.token2external[token];
    // }

    /// @inheritdoc ITokenManager
    function external2token(
        bytes32 externalTokenAddress
    ) public view override returns (address token) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        return $.external2token[externalTokenAddress];
    }

    /// @inheritdoc ITokenManager
    function pausedTokens(
        address token
    ) public view override returns (bool isPaused) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        return !$.unpausedTokens[token];
    }

    function samb() public view returns (address SAMB) {
        return _getTokenManagerStorage().SAMB;
    }

    function _addToken(
        address token,
        bytes32 externalTokenAddress
    ) private returns (bool success) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        if ($.bridgableTokens[token]) {
            revert TokenAlreadyAdded(token);
        }
        $.bridgableTokens[token] = true;
        // $.token2external[token] = externalTokenAddress;
        $.external2token[externalTokenAddress] = token;
        return true;
    }

    function _mapToken(
        bytes32 externalTokenAddress,
        address token
    ) private returns (bool success) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        if (!$.bridgableTokens[token]) {
            revert TokenNotAdded(token);
        }
        $.external2token[externalTokenAddress] = token;
        return true;
    }

    function _removeToken(
        address token,
        bytes32 externalTokenAddress
    ) private returns (bool success) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        if (!$.bridgableTokens[token]) {
            revert TokenNotAdded(token);
        }
        delete $.bridgableTokens[token];
        // delete $.token2external[token];
        delete $.external2token[externalTokenAddress];
        delete $.unpausedTokens[token];
        return true;
    }

    function _deployExternalTokenERC20(
        bytes32 externalTokenAddress,
        string calldata name,
        string calldata symbol,
        uint8 decimals
    ) private returns (address token) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        address bridge = $.bridge;
        token = address(new ERC20Bridged(name, symbol, decimals, bridge));
        _addToken(token, externalTokenAddress);
        _pauseToken(token);
        return token;
    }

    function _pauseToken(address token) private returns (bool success) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        if (!$.unpausedTokens[token]) {
            revert TokenIsPaused(token);
        }
        $.unpausedTokens[token] = false;
        return true;
    }

    function _unpauseToken(address token) private returns (bool success) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        if ($.unpausedTokens[token]) {
            revert TokenNotPaused(token);
        }
        $.unpausedTokens[token] = true;
        return true;
    }
}
