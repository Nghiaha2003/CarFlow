// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./OnchainIdentityRegistry.sol";
import "./VehicleIdentityRegistry.sol";
import "./VehicleShareToken.sol";
import "./DividendVault.sol";

/**
 * @title AssetTokenizationManager
 * @notice Orchestrator contract executing atomic 4-step RWA vehicle tokenization (Section 5.3.3.H)
 */
contract AssetTokenizationManager {
    struct TokenizedVehicleBundle {
        string assetId;
        address shareToken;
        address dividendVault;
        uint256 totalShares;
        uint256 tokenizedAt;
        bool active;
    }

    address public admin;
    OnchainIdentityRegistry public identityRegistry;
    VehicleIdentityRegistry public vehicleRegistry;

    mapping(string => TokenizedVehicleBundle) public bundles;
    string[] public tokenizedAssetIds;

    event AssetTokenized(
        string assetId,
        address indexed shareToken,
        address indexed dividendVault,
        uint256 totalShares
    );

    error OnlyAdmin();
    error AlreadyTokenized(string assetId);

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    constructor(address _identityRegistry, address _vehicleRegistry) {
        admin = msg.sender;
        identityRegistry = OnchainIdentityRegistry(_identityRegistry);
        vehicleRegistry = VehicleIdentityRegistry(_vehicleRegistry);
    }

    function tokenizeAsset(
        string memory assetId,
        string memory vin,
        string memory licensePlate,
        string memory ipfsMetadataHash,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 totalShares
    ) external onlyAdmin returns (address shareTokenAddr, address vaultAddr) {
        if (bundles[assetId].active) revert AlreadyTokenized(assetId);

        // Step 1: Register immutable vehicle legal identity & IPFS CID on-chain
        vehicleRegistry.registerVehicle(assetId, vin, licensePlate, ipfsMetadataHash);

        // Step 2: Deploy dedicated ERC-3643 VehicleShareToken
        VehicleShareToken shareToken = new VehicleShareToken(
            assetId,
            tokenName,
            tokenSymbol,
            totalShares,
            address(identityRegistry),
            admin,
            admin
        );

        // Step 3: Deploy dedicated ERC-4626 style DividendVault & link hook
        DividendVault vault = new DividendVault(address(shareToken), admin);
        shareToken.setDividendVault(address(vault));

        bundles[assetId] = TokenizedVehicleBundle({
            assetId: assetId,
            shareToken: address(shareToken),
            dividendVault: address(vault),
            totalShares: totalShares,
            tokenizedAt: block.timestamp,
            active: true
        });
        tokenizedAssetIds.push(assetId);

        emit AssetTokenized(assetId, address(shareToken), address(vault), totalShares);
        return (address(shareToken), address(vault));
    }

    function getTokenizedCount() external view returns (uint256) {
        return tokenizedAssetIds.length;
    }
}
