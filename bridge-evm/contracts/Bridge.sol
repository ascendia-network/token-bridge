// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Bridge is Initializable, OwnableUpgradeable {
    address[] public validators;
    mapping(string => address) public tokens;
    mapping(bytes32 => bool) public log;

    error TokensLokedError(address from, string token, uint256 amount);
    error SignatureError(bytes32 messageHash, bytes signature);
    error UnlockError(string message);

    event TokensLocked(
        string to,
        string token,
        uint256 amount,
        bytes32 indexed txHash
    );
    event TokenUnlocked(
        string to,
        string token,
        uint256 amount,
        bytes32 indexed txHash
    );

    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    function addValidator(address validator) external onlyOwner {
        validators.push(validator);
    }

    function deleteValidator(uint256 index) external onlyOwner {
        validators[index] = validators[validators.length - 1];
        validators.pop();
    }

    function addToken(
        string calldata token,
        address tokenAddress
    ) external onlyOwner {
        tokens[token] = tokenAddress;
    }

    function lockTokens(
        string calldata to,
        string calldata token,
        uint256 amount
    ) external {
        if (
            !IERC20(tokens[token]).transferFrom(
                msg.sender,
                address(this),
                amount
            )
        ) revert TokensLokedError(msg.sender, token, amount);

        bytes32 txHash = keccak256(
            abi.encodePacked(msg.sender, amount, block.timestamp)
        );
        emit TokensLocked(to, token, amount, txHash);
    }

    function unlockTokens(
        string calldata to,
        string calldata token,
        uint256 amount,
        bytes32 txHash,
        bytes[] memory signature
    ) external {
        if (log[txHash]) revert UnlockError("txHash exist");
        bytes32 messageHash = keccak256(abi.encode(to, token, amount, txHash));
        if (signature.length == 0 || validators.length == 0)
            revert SignatureError(messageHash, "");

        for (uint256 i = 0; i < validators.length; i++) {
            if (validators[i] != recoverSigner(messageHash, signature[i]))
                revert SignatureError(messageHash, signature[i]);
        }

        log[txHash] = true;
        ERC20(tokens[token]).transfer(stringToAddress(to), amount);
        emit TokenUnlocked(to, token, amount, txHash);
    }

    function recoverSigner(
        bytes32 messageHash,
        bytes memory signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(messageHash, v, r, s);
    }

    function splitSignature(
        bytes memory sig
    ) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    function stringToAddress(
        string memory _address
    ) public pure returns (address) {
        bytes memory tempBytes = bytes(_address);
        require(tempBytes.length == 42, "Invalid address length");
        require(
            tempBytes[0] == "0" && tempBytes[1] == "x",
            "Address must start with '0x'"
        );

        uint160 addr = 0;
        uint8 b;
        for (uint256 i = 2; i < 42; i++) {
            b = uint8(tempBytes[i]);

            if (b >= 48 && b <= 57) {
                b -= 48;
            } else if (b >= 65 && b <= 70) {
                b -= 55;
            } else if (b >= 97 && b <= 102) {
                b -= 87;
            } else {
                revert("Invalid character in address");
            }

            addr = addr * 16 + uint160(b);
        }
        return address(addr);
    }
}
