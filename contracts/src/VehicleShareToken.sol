// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIdentityRegistry {
    function isVerified(address wallet) external view returns (bool);
}

interface IDividendVaultHook {
    function beforeShareTransfer(address from, address to, uint256 amount) external;
}

/**
 * @title VehicleShareToken
 * @notice ERC-3643 (T-REX style) Permissioned RWA Share Token with KYC enforcement, Freeze, and ForceTransfer
 */
contract VehicleShareToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 0;

    string public assetId;
    address public identityRegistry;
    address public agent;
    address public factory;
    address public dividendVault;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public frozenWallets;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TokenFrozen(address indexed wallet, bool frozen);
    event TokensForceTransferred(address indexed from, address indexed to, uint256 amount);

    error OnlyAgent();
    error WalletIsFrozen(address wallet);
    error RecipientNotKYCVerified(address wallet);
    error InsufficientShares();
    error InsufficientAllowance();

    modifier onlyAgentOrFactory() {
        if (msg.sender != agent && msg.sender != factory) revert OnlyAgent();
        _;
    }

    constructor(
        string memory _assetId,
        string memory _name,
        string memory _symbol,
        uint256 _totalShares,
        address _identityRegistry,
        address _agent,
        address _initialTreasury
    ) {
        assetId = _assetId;
        name = _name;
        symbol = _symbol;
        totalSupply = _totalShares;
        identityRegistry = _identityRegistry;
        agent = _agent;
        factory = msg.sender;

        balanceOf[_initialTreasury] = _totalShares;
        emit Transfer(address(0), _initialTreasury, _totalShares);
    }

    function setDividendVault(address _vault) external onlyAgentOrFactory {
        dividendVault = _vault;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _compliantTransfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < amount) revert InsufficientAllowance();
        allowance[from][msg.sender] = allowed - amount;
        _compliantTransfer(from, to, amount);
        return true;
    }

    function freezeToken(address wallet, bool freeze) external onlyAgentOrFactory {
        frozenWallets[wallet] = freeze;
        emit TokenFrozen(wallet, freeze);
    }

    function forceTransfer(address from, address to, uint256 amount) external onlyAgentOrFactory {
        if (!IIdentityRegistry(identityRegistry).isVerified(to)) revert RecipientNotKYCVerified(to);
        if (balanceOf[from] < amount) revert InsufficientShares();

        if (dividendVault != address(0)) {
            IDividendVaultHook(dividendVault).beforeShareTransfer(from, to, amount);
        }

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        emit TokensForceTransferred(from, to, amount);
    }

    function _compliantTransfer(address from, address to, uint256 amount) internal {
        if (frozenWallets[from]) revert WalletIsFrozen(from);
        if (frozenWallets[to]) revert WalletIsFrozen(to);
        if (!IIdentityRegistry(identityRegistry).isVerified(to)) revert RecipientNotKYCVerified(to);
        if (balanceOf[from] < amount) revert InsufficientShares();

        if (dividendVault != address(0)) {
            IDividendVaultHook(dividendVault).beforeShareTransfer(from, to, amount);
        }

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
