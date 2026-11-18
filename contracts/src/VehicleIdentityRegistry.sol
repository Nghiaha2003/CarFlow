// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title VehicleIdentityRegistry
 * @notice Immutable on-chain vehicle legal registry & maintenance proof ledger (Section 5.3.3.E & API-10)
 */
contract VehicleIdentityRegistry {
    struct VehicleData {
        string assetId;
        string vin;
        string licensePlate;
        string ipfsMetadataHash;
        uint256 registeredAt;
        bool exists;
    }

    struct MaintenanceProof {
        string maintenanceId;
        string garageName;
        string invoiceCid;
        uint256 recordedAt;
    }

    address public adminAddress;
    mapping(address => bool) public authorizedManagers;
    mapping(string => VehicleData) private vehicleRegistry;
    mapping(string => MaintenanceProof[]) private maintenanceLogs;

    event VehicleRegistered(string assetId, string vin, string ipfsMetadataHash);
    event MaintenanceProved(string assetId, string maintenanceId, string garageName, string invoiceCid);

    error UnauthorizedCaller();
    error VehicleAlreadyRegistered(string assetId);
    error VehicleNotFound(string assetId);

    modifier onlyAuthorized() {
        if (msg.sender != adminAddress && !authorizedManagers[msg.sender]) revert UnauthorizedCaller();
        _;
    }

    constructor() {
        adminAddress = msg.sender;
        authorizedManagers[msg.sender] = true;
    }

    function setAuthorizedManager(address manager, bool allowed) external {
        if (msg.sender != adminAddress) revert UnauthorizedCaller();
        authorizedManagers[manager] = allowed;
    }

    function registerVehicle(
        string memory assetId,
        string memory vin,
        string memory licensePlate,
        string memory ipfsMetadataHash
    ) external onlyAuthorized {
        if (vehicleRegistry[assetId].exists) revert VehicleAlreadyRegistered(assetId);
        vehicleRegistry[assetId] = VehicleData({
            assetId: assetId,
            vin: vin,
            licensePlate: licensePlate,
            ipfsMetadataHash: ipfsMetadataHash,
            registeredAt: block.timestamp,
            exists: true
        });
        emit VehicleRegistered(assetId, vin, ipfsMetadataHash);
    }

    function recordMaintenanceProof(
        string memory assetId,
        string memory maintenanceId,
        string memory garageName,
        string memory invoiceCid
    ) external onlyAuthorized {
        if (!vehicleRegistry[assetId].exists) revert VehicleNotFound(assetId);
        maintenanceLogs[assetId].push(
            MaintenanceProof({
                maintenanceId: maintenanceId,
                garageName: garageName,
                invoiceCid: invoiceCid,
                recordedAt: block.timestamp
            })
        );
        emit MaintenanceProved(assetId, maintenanceId, garageName, invoiceCid);
    }

    function getVehicleInfo(string memory assetId) external view returns (VehicleData memory) {
        if (!vehicleRegistry[assetId].exists) revert VehicleNotFound(assetId);
        return vehicleRegistry[assetId];
    }

    function getMaintenanceCount(string memory assetId) external view returns (uint256) {
        return maintenanceLogs[assetId].length;
    }
}
