// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from
    "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {ITokenManager} from "../interface/ITokenManager.sol";
import {IWrapped} from "../interface/IWrapped.sol";
import {AddressUtils} from "../utils/AddressUtils.sol";

import {ERC20Bridged} from "../token/ERC20Bridged.sol";

abstract contract TokenManagerUpgradeable is ITokenManager, Initializable {

    using AddressUtils for bytes32;

    /// @custom:storage-location erc7201:airdao.bridge.token-manager.storage
    struct TokenManagerStorage {
        mapping(address => ExternalToken[]) bridgableTokens;
        mapping(uint256 => mapping(bytes32 => address)) external2token;
        mapping(address => mapping(uint256 => ExternalToken)) token2external;
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
    )
        internal
        onlyInitializing
    {
        __TokenManager_init_unchained(bridge_, SAMB);
    }

    function __TokenManager_init_unchained(
        address bridge_,
        address SAMB
    )
        internal
        onlyInitializing
    {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        $.bridge = bridge_;
        $.SAMB = SAMB;
    }

    modifier isBridgable(bytes32 token) {
        if (!bridgableTokens(token.toAddress())) {
            revert TokenNotBridgable(token.toAddress());
        }
        _;
    }

    /// @inheritdoc ITokenManager

    function addToken(
        address token,
        ExternalToken[] calldata externalTokens,
        bool paused
    )
        public
        virtual
        returns (bool success)
    {
        bool res = _addToken(token, externalTokens, paused);
        return res;
    }

    /// @inheritdoc ITokenManager

    function mapExternalTokens(
        ExternalToken[] calldata externalTokens,
        address token
    )
        public
        virtual
        returns (bool success)
    {
        for (uint256 i = 0; i < externalTokens.length; i++) {
            bool res = _mapToken(externalTokens[i], token);
            if (!res) {
                return false;
            }
        }
    }

    /// @inheritdoc ITokenManager
    function unmapExternalToken(
        uint256 chainId,
        bytes32 externalTokenAddress
    )
        public
        virtual
        returns (bool success)
    {
        return _unmapToken(chainId, externalTokenAddress);
    }

    /// @inheritdoc ITokenManager
    function pauseToken(address token)
        public
        virtual
        override
        returns (bool success)
    {
        return _pauseToken(token);
    }

    /// @inheritdoc ITokenManager
    function unpauseToken(address token)
        public
        virtual
        override
        returns (bool success)
    {
        return _unpauseToken(token);
    }

    /// @inheritdoc ITokenManager
    function removeToken(address token)
        public
        virtual
        override
        returns (bool success)
    {
        return _removeToken(token);
    }

    /// @inheritdoc ITokenManager
    function deployExternalTokenERC20(
        ExternalToken calldata externalToken,
        string calldata name,
        string calldata symbol,
        uint8 decimals
    )
        public
        virtual
        override
        returns (address token)
    {
        return _deployExternalTokenERC20(externalToken, name, symbol, decimals);
    }

    /// Used to wrap AMB to SAMB
    /// @param amount amount to wrap

    function _wrap(uint256 amount) internal {
        return IWrapped(_getTokenManagerStorage().SAMB).deposit{value: amount}();
    }

    /// Used to unwrap SAMB to AMB
    /// @param amount amount to unwrap
    function _unwrap(uint256 amount) internal {
        return IWrapped(_getTokenManagerStorage().SAMB).withdraw(amount);
    }

    // Needed to receive AMB from wrapped SAMB
    receive() external payable {}

    /// @inheritdoc ITokenManager
    function bridgableTokens(address token)
        public
        view
        override
        returns (bool isBridgable_)
    {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        return $.bridgableTokens[token].length > 0;
    }

    /// @inheritdoc ITokenManager
    function bridgableTokenTo(
        address token,
        uint256 chainId
    )
        public
        view
        override
        returns (bool isBridgableTo)
    {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        return $.token2external[token][chainId].chainId == chainId
            && $.token2external[token][chainId].externalTokenAddress != bytes32(0);
    }

    /// @inheritdoc ITokenManager
    function token2external(
        address token,
        uint256 chainId
    )
        public
        view
        override
        returns (ExternalToken memory externalToken)
    {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        return $.token2external[token][chainId];
    }

    /// @inheritdoc ITokenManager
    function external2token(
        uint256 chainId,
        bytes32 externalTokenAddress
    )
        public
        view
        override
        returns (address token)
    {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        return $.external2token[chainId][externalTokenAddress];
    }

    /// @inheritdoc ITokenManager
    function pausedTokens(address token)
        public
        view
        override
        returns (bool isPaused)
    {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        return !$.unpausedTokens[token];
    }

    /// SAMB address
    /// @return SAMB address of wrapped token
    function samb() public view returns (address SAMB) {
        return _getTokenManagerStorage().SAMB;
    }

    /// Adds token to the bridge
    /// @param token address of the token
    /// @param externalTokens external tokens that should be mapped to the token
    /// @return success true if the token was added
    function _addToken(
        address token,
        ExternalToken[] memory externalTokens,
        bool paused
    )
        private
        returns (bool success)
    {
        if (token == address(0)) {
            revert TokenZeroAddress();
        }
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        if ($.bridgableTokens[token].length > 0) {
            revert TokenAlreadyAdded(token);
        }
        for (uint256 i = 0; i < externalTokens.length; i++) {
            if (
                $.external2token[externalTokens[i].chainId][externalTokens[i]
                    .externalTokenAddress] != address(0)
            ) {
                revert TokenAlreadyMapped(
                    externalTokens[i].externalTokenAddress
                );
            }
            $.bridgableTokens[token].push(externalTokens[i]);
            $.external2token[externalTokens[i].chainId][externalTokens[i]
                .externalTokenAddress] = token;
            $.token2external[token][externalTokens[i].chainId] =
                externalTokens[i];
            emit TokenMapped(
                token,
                externalTokens[i].chainId,
                externalTokens[i].externalTokenAddress
            );
        }
        emit TokenAdded(token);
        $.unpausedTokens[token] = !paused;
        if (paused) {
            emit TokenPaused(token);
        } else {
            emit TokenUnpaused(token);
        }
        return true;
    }

    /// Map external token address to token
    /// @param externalToken external token that should be mapped to the token
    /// @param token address of the token
    /// @return success true if the token was added
    function _mapToken(
        ExternalToken memory externalToken,
        address token
    )
        private
        returns (bool success)
    {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        if ($.bridgableTokens[token].length == 0) {
            revert TokenNotBridgable(token);
        }
        if (
            $.external2token[externalToken.chainId][externalToken
                .externalTokenAddress] != address(0)
        ) {
            revert TokenAlreadyMapped(externalToken.externalTokenAddress);
        }
        $.external2token[externalToken.chainId][externalToken
            .externalTokenAddress] = token;
        $.token2external[token][externalToken.chainId] = externalToken;
        $.bridgableTokens[token].push(externalToken);
        emit TokenMapped(
            token, externalToken.chainId, externalToken.externalTokenAddress
        );
        return true;
    }

    /// Unmap external token address to token
    /// @param externalTokenAddress external token address
    /// @return success true if the token was removed
    function _unmapToken(
        uint256 chainId,
        bytes32 externalTokenAddress
    )
        private
        returns (bool success)
    {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        address token = $.external2token[chainId][externalTokenAddress];
        if (token == address(0)) {
            revert TokenNotMapped(externalTokenAddress);
        }
        for (uint256 i = 0; i < $.bridgableTokens[token].length; i++) {
            if (
                $.bridgableTokens[token][i].externalTokenAddress
                    == externalTokenAddress
                    && $.bridgableTokens[token][i].chainId == chainId
            ) {
                $.bridgableTokens[token][i] = $.bridgableTokens[token][$
                    .bridgableTokens[token].length - 1];
                $.bridgableTokens[token].pop();
                break;
            }
        }
        delete $.external2token[chainId][externalTokenAddress];
        delete $.token2external[token][chainId];
        emit TokenUnmapped(chainId, externalTokenAddress);
        return true;
    }

    /// Remove token from the bridge
    /// @param token address of the token
    /// @return success true if the token was removed
    function _removeToken(address token) private returns (bool success) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        if ($.bridgableTokens[token].length == 0) {
            revert TokenNotAdded(token);
        }
        ExternalToken[] storage tokens = $.bridgableTokens[token];
        for (uint256 i = 0; i < tokens.length; i++) {
            delete $.external2token[tokens[i].chainId][
                tokens[i].externalTokenAddress
            ];
            delete $.token2external[token][tokens[i].chainId];
        }
        delete $.bridgableTokens[token];
        delete $.unpausedTokens[token];
        emit TokenRemoved(token);
        return true;
    }

    /// Deploy external ERC20 token to chain
    /// @dev This function should be called by admin to deploy external token to the chain.
    /// @dev This token will be used for bridging as minting and burning. For more details see `ERC20Bridged` contract.
    /// @param externalToken external token that will be mapped to the token
    /// @param name name of the token
    /// @param symbol symbol of the token
    /// @param decimals decimals of the token
    /// @return token address of the token
    function _deployExternalTokenERC20(
        ExternalToken memory externalToken,
        string calldata name,
        string calldata symbol,
        uint8 decimals
    )
        private
        returns (address token)
    {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        address bridge = $.bridge;
        token = address(new ERC20Bridged(name, symbol, decimals, bridge));
        ExternalToken[] memory tokensExt = new ExternalToken[](1);
        tokensExt[0] = externalToken;
        _addToken(token, tokensExt, true);
        emit TokenDeployed(name, symbol, decimals, token);
        return token;
    }

    /// Pause token bridging
    /// @param token address of the token
    /// @return success true if the token was paused
    function _pauseToken(address token) private returns (bool success) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        if (!$.unpausedTokens[token]) {
            revert TokenIsPaused(token);
        }
        $.unpausedTokens[token] = false;
        emit TokenPaused(token);
        return true;
    }

    /// Unpause token bridging
    /// @param token address of the token
    /// @return success true if the token was unpaused
    function _unpauseToken(address token) private returns (bool success) {
        TokenManagerStorage storage $ = _getTokenManagerStorage();
        if ($.unpausedTokens[token]) {
            revert TokenNotPaused(token);
        }
        $.unpausedTokens[token] = true;
        emit TokenUnpaused(token);
        return true;
    }

}
