// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVehicleShareToken {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title DividendVault
 * @notice ERC-4626 style Tokenized Yield & Dividend Vault distributing fleet net revenue pro-rata to ERC-3643 holders
 */
contract DividendVault {
    uint256 private constant MAGNITUDE = 1e18;

    address public shareToken;
    address public admin;

    uint256 public accYieldPerShare;
    uint256 public totalYieldDeposited;
    uint256 public totalYieldClaimed;

    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public totalClaimedByUser;

    uint256 private unlocked = 1;

    event RevenueDeposited(uint256 amountCents, uint256 newAccYieldPerShare);
    event DividendClaimed(address indexed investor, uint256 amountCents);

    error ReentrancyLocked();
    error Unauthorized();
    error NothingToClaim();

    modifier nonReentrant() {
        if (unlocked != 1) revert ReentrancyLocked();
        unlocked = 2;
        _;
        unlocked = 1;
    }

    constructor(address _shareToken, address _admin) {
        shareToken = _shareToken;
        admin = _admin;
    }

    function beforeShareTransfer(address from, address to, uint256 amount) external {
        if (msg.sender != shareToken) revert Unauthorized();

        if (from != address(0)) {
            uint256 balFrom = IVehicleShareToken(shareToken).balanceOf(from);
            uint256 accFrom = (balFrom * accYieldPerShare) / MAGNITUDE;
            if (accFrom > rewardDebt[from]) {
                pendingRewards[from] += (accFrom - rewardDebt[from]);
            }
            rewardDebt[from] = ((balFrom - amount) * accYieldPerShare) / MAGNITUDE;
        }

        if (to != address(0)) {
            uint256 balTo = IVehicleShareToken(shareToken).balanceOf(to);
            uint256 accTo = (balTo * accYieldPerShare) / MAGNITUDE;
            if (accTo > rewardDebt[to]) {
                pendingRewards[to] += (accTo - rewardDebt[to]);
            }
            rewardDebt[to] = ((balTo + amount) * accYieldPerShare) / MAGNITUDE;
        }
    }

    function depositRevenue(uint256 yieldCents) external payable {
        if (msg.sender != admin) revert Unauthorized();
        uint256 supply = IVehicleShareToken(shareToken).totalSupply();
        require(supply > 0 && yieldCents > 0, "Invalid deposit");
        accYieldPerShare += (yieldCents * MAGNITUDE) / supply;
        totalYieldDeposited += yieldCents;
        emit RevenueDeposited(yieldCents, accYieldPerShare);
    }

    function claimableYield(address investor) public view returns (uint256) {
        uint256 bal = IVehicleShareToken(shareToken).balanceOf(investor);
        uint256 acc = (bal * accYieldPerShare) / MAGNITUDE;
        uint256 liveDelta = acc > rewardDebt[investor] ? (acc - rewardDebt[investor]) : 0;
        return pendingRewards[investor] + liveDelta;
    }

    function claimDividend(address investor) external nonReentrant returns (uint256 amount) {
        if (msg.sender != investor && msg.sender != admin) revert Unauthorized();
        amount = claimableYield(investor);
        if (amount == 0) revert NothingToClaim();

        uint256 bal = IVehicleShareToken(shareToken).balanceOf(investor);
        rewardDebt[investor] = (bal * accYieldPerShare) / MAGNITUDE;
        pendingRewards[investor] = 0;
        totalClaimedByUser[investor] += amount;
        totalYieldClaimed += amount;

        emit DividendClaimed(investor, amount);
    }
}
