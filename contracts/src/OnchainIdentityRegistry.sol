// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title OnchainIdentityRegistry
 * @notice ONCHAINID / KYC Compliance Registry for ERC-3643 Permissioned RWA Tokens
 */
contract OnchainIdentityRegistry {
    address public admin;
    mapping(address => bool) public agents;
    mapping(address => bool) private verifiedWallets;
    mapping(address => bytes32) public kycClaimHashes;

    event IdentityVerified(address indexed wallet, bytes32 claimHash);
    event IdentityRevoked(address indexed wallet);
    event AgentUpdated(address indexed agent, bool active);

    error UnauthorizedAgent();

    modifier onlyAgent() {
        if (msg.sender != admin && !agents[msg.sender]) revert UnauthorizedAgent();
        _;
    }

    constructor() {
        admin = msg.sender;
        agents[msg.sender] = true;
        verifiedWallets[msg.sender] = true;
        kycClaimHashes[msg.sender] = keccak256("SYSTEM_ADMIN_GENESIS_KYC");
    }

    function setAgent(address agent, bool active) external {
        if (msg.sender != admin) revert UnauthorizedAgent();
        agents[agent] = active;
        emit AgentUpdated(agent, active);
    }

    function registerIdentity(address wallet, bytes32 claimHash) external onlyAgent {
        verifiedWallets[wallet] = true;
        kycClaimHashes[wallet] = claimHash;
        emit IdentityVerified(wallet, claimHash);
    }

    function revokeIdentity(address wallet) external onlyAgent {
        verifiedWallets[wallet] = false;
        emit IdentityRevoked(wallet);
    }

    function isVerified(address wallet) external view returns (bool) {
        return verifiedWallets[wallet];
    }
}
