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
        mapping(address => bytes32) token2external;
        mapping(bytes32 => address) external2token;
        mapping(address => bool) pausedTokens;
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

    function __TokenManager_init(address bridge_, address SAMB) internal onlyInitializing {
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

    modifier isNotPaused(address token) {
        if(pausedTokens(token)) {
            revert TokenIsPaused(token);
        }
        _;
    }

    function _wrap(uint256 amount) internal {
        return IWrapped(_getTokenManagerStorage().SAMB).deposit{value: amount}();
    }

    function _unwrap(uint256 amount) internal {
        return IWrapped(_getTokenManagerStorage().SAMB).withdraw(amount);
    }

    // Needed to receive AMB from wrapped SAMB
    receive() external payable {}

    /// @inheritdoc ITokenManager
    function addToken(
        address token,
        bytes32 externalTokenAddress
    ) external override returns (bool success) {
        return _addToken(token, externalTokenAddress) && _pauseToken(token);
    }

    /// @inheritdoc ITokenManager
    function pauseToken(
        address token
    ) external override returns (bool success) {
        return _pauseToken(token);
    }

    /// @inheritdoc ITokenManager
    function unpauseToken(
        address token
    ) external override returns (bool success) {
        return _unpauseToken(token);
    }

    /// @inheritdoc ITokenManager
    function removeToken(
        address token
    ) external override returns (bool success) {
        return _removeToken(token);
    }

    /// @inheritdoc ITokenManager
    function deployExternalTokenERC20(
        bytes32 externalTokenAddress,
        string calldata name,
        string calldata symbol,
        uint8 decimals
    ) public override returns (address token) {
        return
            _deployExternalTokenERC20(
                externalTokenAddress,
                name,
                symbol,
                decimals
            );
    }

    /// @inheritdoc ITokenManager
    function bridgableTokens(
        address token
    ) public view override returns (bool isBridgable) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        return $.bridgableTokens[token];
    }

    /// @inheritdoc ITokenManager
    function token2external(
        address token
    ) public view override returns (bytes32 externalTokenAddress) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        return $.token2external[token];
    }

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
        return $.pausedTokens[token];
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
        $.token2external[token] = externalTokenAddress;
        $.external2token[externalTokenAddress] = token;
        return true;
    }

    function _removeToken(address token) private returns (bool success) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        if (!$.bridgableTokens[token]) {
            revert TokenNotAdded(token);
        }
        delete $.bridgableTokens[token];
        delete $.token2external[token];
        delete $.external2token[$.token2external[token]];
        delete $.pausedTokens[token];
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
        if ($.pausedTokens[token]) {
            revert TokenIsPaused(token);
        }
        $.pausedTokens[token] = true;
        return true;
    }

    function _unpauseToken(address token) private returns (bool success) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        if (!$.pausedTokens[token]) {
            revert TokenNotPaused(token);
        }
        $.pausedTokens[token] = false;
        return true;
    }
}
