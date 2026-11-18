import { Router } from 'express';
import { ethers } from 'ethers';
import { prisma } from '../config/prisma.js';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.middleware.js';
import {
  getCoreContractInstances,
  loadContractArtifact,
} from '../services/blockchain.service.js';

const router = Router();

// GET /api/v1/operation/records
router.get('/operation/records', async (_req, res) => {
  try {
    const [records, assets] = await Promise.all([
      prisma.operationRecord.findMany({
        include: {
          asset: { select: { id: true, assetCode: true, vehicleName: true, licensePlate: true } },
          operator: { select: { fullName: true, email: true } },
        },
        orderBy: { recordedAt: 'desc' },
        take: 40,
      }),
      prisma.asset.findMany({
        include: { tokens: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return res.json({ success: true, records, assets });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// API-09: POST /api/v1/operation/records (Update Daily Operation Record + Sync Net Profit to ERC-4626 DividendVault)
router.post(
  '/operation/records',
  authenticateJWT,
  authorizeRoles('OPERATOR', 'ADMIN', 'OWNER'),
  async (req, res) => {
    try {
      const assetId = req.body.asset_id || req.body.assetId;
      const mileage = Math.round(Number(req.body.mileage ?? 0));
      const revenue = Number(req.body.revenue ?? 0);
      const cost = Number(req.body.cost ?? 0);
      const operationStatus = req.body.operation_status || req.body.operationStatus || 'COMPLETED_SHIFT';
      const note = (req.body.note || '').trim() || null;

      if (revenue < 0 || cost < 0) {
        return res.status(400).json({
          success: false,
          code: 'NEGATIVE_VALUES',
          message: 'Doanh thu hoặc chi phí vận hành không được mang giá trị âm.',
        });
      }

      if (mileage <= 0) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_MILEAGE',
          message: 'Quãng đường di chuyển trong ca (mileage) phải lớn hơn 0 km.',
        });
      }

      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { tokens: true },
      });

      if (!asset) {
        return res.status(404).json({
          success: false,
          code: 'ASSET_NOT_FOUND',
          message: 'Không tìm thấy phương tiện tương thích với asset_id đã cung cấp.',
        });
      }

      const netProfit = Number((revenue - cost).toFixed(2));

      const record = await prisma.operationRecord.create({
        data: {
          assetId: asset.id,
          operatorId: req.user.id,
          operationStatus,
          mileage,
          revenue,
          cost,
          netProfit,
          note,
        },
      });

      let vaultTxHash = null;
      const tokenRec = asset.tokens?.[0];
      if (netProfit > 0 && tokenRec?.vaultAddress) {
        try {
          const { admin } = await getCoreContractInstances();
          const vaultArt = loadContractArtifact('DividendVault');
          const vault = new ethers.Contract(tokenRec.vaultAddress, vaultArt.abi, admin);
          const yieldCents = BigInt(Math.round(netProfit * 100));
          if (yieldCents > 0n) {
            const tx = await vault.depositRevenue(yieldCents);
            const receipt = await tx.wait();
            vaultTxHash = receipt.hash;
          }
        } catch (vaultErr) {
          console.warn('DividendVault deposit warning:', vaultErr.message);
        }
      }

      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'RECORD_FLEET_OPERATION',
          entityType: 'operation',
          entityId: record.id,
          newValue: JSON.stringify({
            assetCode: asset.assetCode,
            mileage,
            revenue,
            cost,
            netProfit,
            vaultTxHash,
          }),
        },
      });

      return res.status(201).json({
        success: true,
        message: vaultTxHash
          ? `Đã lưu nhật ký vận hành & tự động nạp $${netProfit.toFixed(2)} lợi nhuận ròng vào hợp đồng DividendVault (ERC-4626)!`
          : 'Cập nhật dữ liệu vận hành thành công.',
        data: {
          record_id: record.id,
          asset_id: asset.id,
          mileage: record.mileage,
          net_profit: record.netProfit,
          vault_tx_hash: vaultTxHash,
          created_at: record.recordedAt,
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/v1/investments/portfolio (Live ERC-3643 Holdings + Live ERC-4626 Claimable Dividends)
router.get('/investments/portfolio', authenticateJWT, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const [holdings, allTokenizedAssets] = await Promise.all([
      prisma.tokenHolding.findMany({
        where: { investorId: user.id, tokenBalance: { gt: 0 } },
        include: {
          assetToken: {
            include: { asset: true },
          },
        },
      }),
      prisma.asset.findMany({
        where: { tokenizationStatus: 'TOKENIZED' },
        include: { tokens: { include: { holdings: true } } },
      }),
    ]);

    await getCoreContractInstances().catch(() => null);
    const vaultArt = loadContractArtifact('DividendVault');
    const { admin } = await getCoreContractInstances();

    const enrichedHoldings = await Promise.all(
      holdings.map(async (h) => {
        let claimableUsd = 0;
        if (user.walletAddress && h.assetToken.vaultAddress) {
          try {
            const vault = new ethers.Contract(h.assetToken.vaultAddress, vaultArt.abi, admin);
            const rawCents = await vault.claimableYield(user.walletAddress);
            claimableUsd = Number(rawCents) / 100;
          } catch {
            claimableUsd = 0;
          }
        }
        const investedUsd = h.tokenBalance * h.assetToken.unitPrice;
        return {
          holdingId: h.id,
          assetId: h.assetToken.asset.id,
          assetCode: h.assetToken.asset.assetCode,
          vehicleName: h.assetToken.asset.vehicleName,
          vehicleSegment: h.assetToken.asset.vehicleSegment,
          targetApr: h.assetToken.asset.targetApr,
          tokenSymbol: h.assetToken.tokenSymbol,
          tokenBalance: h.tokenBalance,
          totalSupply: h.assetToken.totalSupply,
          ownershipPct: Number(((h.tokenBalance / h.assetToken.totalSupply) * 100).toFixed(2)),
          investedUsd,
          claimedYieldUsd: h.claimedYield,
          claimableUsd,
          vaultAddress: h.assetToken.vaultAddress,
          assetTokenId: h.assetToken.id,
        };
      })
    );

    const totalInvested = enrichedHoldings.reduce((s, p) => s + p.investedUsd, 0);
    const totalClaimed = enrichedHoldings.reduce((s, p) => s + p.claimedYieldUsd, 0);
    const totalClaimable = enrichedHoldings.reduce((s, p) => s + p.claimableUsd, 0);

    // Segment summary pools matching Fig 5.18 / Investments screen
    const segmentPools = ['EV', 'Luxury', 'Logistics'].map((seg) => {
      const segAssets = allTokenizedAssets.filter((a) => a.vehicleSegment === seg);
      const liquidity = segAssets.reduce((s, a) => s + a.estimatedValue, 0);
      const avgApr =
        segAssets.length > 0
          ? Number((segAssets.reduce((s, a) => s + a.targetApr, 0) / segAssets.length).toFixed(1))
          : seg === 'Logistics'
          ? 15.4
          : 12.8;
      return {
        segment: seg,
        title:
          seg === 'EV'
            ? 'EV Commercial Fleet Pool'
            : seg === 'Luxury'
            ? 'Luxury Executive S25'
            : 'Cold-Chain Logistics Pool',
        avgApr,
        liquidity: liquidity || 46000,
        vehicleCount: segAssets.length,
      };
    });

    return res.json({
      success: true,
      summary: {
        totalInvestedUsd: totalInvested,
        totalClaimedUsd: Number(totalClaimed.toFixed(2)),
        totalClaimableUsd: Number(totalClaimable.toFixed(2)),
        activePositions: enrichedHoldings.length,
      },
      positions: enrichedHoldings,
      pools: segmentPools,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/investments/claim-yield (Claim Dividends from ERC-4626 DividendVault)
router.post('/investments/claim-yield', authenticateJWT, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.walletAddress) {
      return res.status(400).json({ success: false, message: 'Bạn chưa liên kết địa chỉ ví Web3.' });
    }

    const holdings = await prisma.tokenHolding.findMany({
      where: { investorId: user.id, tokenBalance: { gt: 0 } },
      include: { assetToken: { include: { asset: true } } },
    });

    const { admin } = await getCoreContractInstances();
    const vaultArt = loadContractArtifact('DividendVault');

    let totalClaimedNow = 0;
    const txHashes = [];

    for (const h of holdings) {
      if (!h.assetToken.vaultAddress) continue;
      const vault = new ethers.Contract(h.assetToken.vaultAddress, vaultArt.abi, admin);
      const pendingCents = await vault.claimableYield(user.walletAddress);
      if (pendingCents > 0n) {
        const tx = await vault.claimDividend(user.walletAddress);
        const receipt = await tx.wait();
        const claimedUsd = Number(pendingCents) / 100;
        totalClaimedNow += claimedUsd;
        txHashes.push(receipt.hash);

        await prisma.tokenHolding.update({
          where: { id: h.id },
          data: { claimedYield: h.claimedYield + claimedUsd },
        });

        await prisma.tokenTransaction.create({
          data: {
            assetTokenId: h.assetToken.id,
            fromUserId: null,
            toUserId: user.id,
            transactionType: 'dividend_claim',
            tokenAmount: h.tokenBalance,
            unitPrice: 0,
            totalValue: claimedUsd,
            blockchainTxHash: receipt.hash,
            transactionStatus: 'success',
          },
        });
      }
    }

    if (totalClaimedNow === 0) {
      return res.status(400).json({
        success: false,
        code: 'NO_CLAIMABLE_YIELD',
        message: 'Hiện chưa có cổ tức mới chờ rút. Hãy ghi nhận thêm doanh thu vận hành tại mục Vận hành & Bảo dưỡng!',
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'CLAIM_ERC4626_DIVIDENDS',
        entityType: 'dividend',
        entityId: user.id,
        newValue: JSON.stringify({ totalClaimedUsd: totalClaimedNow, txHashes }),
      },
    });

    return res.json({
      success: true,
      message: `Đã rút thành công $${totalClaimedNow.toFixed(2)} cổ tức từ hợp đồng DividendVault (ERC-4626) về ví ${user.walletAddress.slice(0, 8)}...!`,
      claimedUsd: Number(totalClaimedNow.toFixed(2)),
      txHashes,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
