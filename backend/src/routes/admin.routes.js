import { Router } from 'express';
import { ethers } from 'ethers';
import { prisma } from '../config/prisma.js';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.middleware.js';
import {
  getCoreContractInstances,
  loadContractArtifact,
} from '../services/blockchain.service.js';

const router = Router();

router.use('/admin', authenticateJWT, authorizeRoles('ADMIN'));

// GET /api/v1/admin/overview
router.get('/admin/overview', async (_req, res) => {
  try {
    const [requests, assets, users, assignments, core] = await Promise.all([
      prisma.tokenizationRequest.findMany({
        include: {
          asset: { include: { documents: true, tokens: true } },
          requester: { select: { id: true, fullName: true, email: true, walletAddress: true } },
        },
        orderBy: { requestedAt: 'desc' },
      }),
      prisma.asset.findMany({
        include: {
          documents: true,
          tokens: true,
          operatorAssignments: {
            where: { status: 'active' },
            include: { operator: { select: { id: true, fullName: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        include: { role: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.assetOperatorAssignment.findMany({
        where: { status: 'active' },
        include: {
          asset: { select: { id: true, assetCode: true, vehicleName: true } },
          operator: { select: { id: true, fullName: true, email: true } },
        },
      }),
      getCoreContractInstances().catch(() => null),
    ]);

    return res.json({
      success: true,
      coreContracts: core?.addresses || null,
      requests,
      assets,
      users: users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role.roleName,
        walletAddress: u.walletAddress,
        kycStatus: u.kycStatus,
        status: u.status,
      })),
      assignments,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/admin/kyc/verify
router.post('/admin/kyc/verify', async (req, res) => {
  try {
    const { userId, approve = true } = req.body;
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }
    if (!targetUser.walletAddress || !ethers.isAddress(targetUser.walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Người dùng này chưa liên kết địa chỉ ví EVM hợp lệ để ghi nhận ONCHAINID.',
      });
    }

    const { identityRegistry } = await getCoreContractInstances();
    let tx;
    if (approve) {
      const claimHash = ethers.id(`ONCHAINID_VN_${targetUser.id}_${Date.now()}`);
      tx = await identityRegistry.registerIdentity(targetUser.walletAddress, claimHash);
    } else {
      tx = await identityRegistry.revokeIdentity(targetUser.walletAddress);
    }
    const receipt = await tx.wait();

    const newStatus = approve ? 'VERIFIED' : 'UNVERIFIED';
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { kycStatus: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: approve ? 'APPROVE_KYC_ONCHAINID' : 'REVOKE_KYC_ONCHAINID',
        entityType: 'kyc',
        entityId: targetUser.id,
        newValue: JSON.stringify({
          wallet: targetUser.walletAddress,
          kycStatus: newStatus,
          txHash: receipt.hash,
        }),
      },
    });

    return res.json({
      success: true,
      message: approve
        ? `Đã xác thực KYC ONCHAINID trên Blockchain cho ví ${targetUser.walletAddress.slice(0, 10)}...`
        : 'Đã thu hồi chứng nhận KYC on-chain.',
      txHash: receipt.hash,
      kycStatus: newStatus,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// API-06: POST /api/v1/admin/tokenization/approve
router.post('/admin/tokenization/approve', async (req, res) => {
  try {
    const assetId = req.body.asset_id || req.body.assetId;
    const decision = (req.body.decision || 'APPROVE').toUpperCase();
    const reviewNote = req.body.review_note || req.body.reviewNote || 'Hồ sơ pháp lý và chứng từ IPFS hợp lệ.';

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { documents: true, tokens: true, tokenizationRequests: true },
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        code: 'ASSET_NOT_FOUND',
        message: 'Không tìm thấy phương tiện cần phê duyệt.',
      });
    }

    if (decision === 'REJECT') {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { tokenizationStatus: 'REJECTED' },
      });
      await prisma.tokenizationRequest.updateMany({
        where: { assetId: asset.id, requestStatus: 'pending' },
        data: {
          requestStatus: 'rejected',
          reviewedBy: req.user.id,
          reviewNote,
          reviewedAt: new Date(),
        },
      });
      return res.json({ success: true, message: 'Đã từ chối yêu cầu token hóa phương tiện.' });
    }

    if (asset.tokenizationStatus === 'TOKENIZED' && asset.tokens.length > 0) {
      return res.status(409).json({
        success: false,
        code: 'ALREADY_TOKENIZED',
        message: 'Phương tiện này đã được phát hành token trên chuỗi khối.',
      });
    }

    const unitPrice = Number(req.body.unit_price ?? req.body.unitPrice ?? 10);
    const totalShares = Math.max(
      100,
      Math.round(Number(req.body.total_shares ?? req.body.totalShares ?? asset.estimatedValue / unitPrice))
    );
    const tokenSymbol = asset.assetCode.replace(/-/g, '');
    const primaryDoc = asset.documents?.[0];
    const ipfsCid = primaryDoc?.ipfsCid || 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
    const metadataHash = primaryDoc?.documentHash || ethers.id(ipfsCid);

    const { tokenizationManager } = await getCoreContractInstances();
    const tx = await tokenizationManager.tokenizeAsset(
      asset.assetCode,
      asset.chassisNumber || asset.assetCode,
      asset.licensePlate,
      ipfsCid,
      `CarFlow ${asset.vehicleName.slice(0, 22)}`,
      tokenSymbol,
      BigInt(totalShares)
    );
    const receipt = await tx.wait();
    const bundle = await tokenizationManager.bundles(asset.assetCode);

    const tokenRecord = await prisma.assetToken.create({
      data: {
        assetId: asset.id,
        tokenType: 'ERC3643_SHARE',
        tokenStandard: 'ERC-3643',
        tokenSymbol,
        contractAddress: bundle.shareToken,
        vaultAddress: bundle.dividendVault,
        registryHash: ethers.id(`${asset.assetCode}:${asset.chassisNumber}:${ipfsCid}`),
        totalSupply: totalShares,
        availableSupply: totalShares,
        unitPrice,
        metadataUri: `ipfs://${ipfsCid}`,
        metadataHash,
        mintTxHash: receipt.hash,
        tokenStatus: 'active',
      },
    });

    await prisma.asset.update({
      where: { id: asset.id },
      data: { tokenizationStatus: 'TOKENIZED' },
    });

    await prisma.tokenizationRequest.updateMany({
      where: { assetId: asset.id, requestStatus: 'pending' },
      data: {
        requestStatus: 'approved',
        reviewedBy: req.user.id,
        reviewNote,
        reviewedAt: new Date(),
      },
    });

    await prisma.tokenTransaction.create({
      data: {
        assetTokenId: tokenRecord.id,
        fromUserId: null,
        toUserId: req.user.id,
        transactionType: 'mint',
        tokenAmount: totalShares,
        unitPrice,
        totalValue: totalShares * unitPrice,
        blockchainTxHash: receipt.hash,
        transactionStatus: 'success',
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'TOKENIZE_ASSET_ONCHAIN',
        entityType: 'token',
        entityId: tokenRecord.id,
        newValue: JSON.stringify({
          assetCode: asset.assetCode,
          shareToken: bundle.shareToken,
          dividendVault: bundle.dividendVault,
          totalShares,
          mintTxHash: receipt.hash,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Phê duyệt & phát hành thành công ${totalShares.toLocaleString()} cổ phần ERC-3643 kèm kho cổ tức ERC-4626 cho xe ${asset.assetCode}!`,
      data: {
        asset_id: asset.id,
        token_symbol: tokenSymbol,
        share_token_address: bundle.shareToken,
        dividend_vault_address: bundle.dividendVault,
        mint_tx_hash: receipt.hash,
        total_shares: totalShares,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'BLOCKCHAIN_MINT_FAILED',
      message: err.message,
    });
  }
});

// POST /api/v1/admin/operators/assign
router.post('/admin/operators/assign', async (req, res) => {
  try {
    const { assetId, operatorId } = req.body;
    if (!assetId || !operatorId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin xe hoặc người vận hành.' });
    }

    const existing = await prisma.assetOperatorAssignment.findFirst({
      where: { assetId, operatorId, status: 'active' },
    });
    if (existing) {
      return res.json({ success: true, message: 'Người vận hành này đã được phân công cho phương tiện.' });
    }

    const assignment = await prisma.assetOperatorAssignment.create({
      data: { assetId, operatorId, status: 'active' },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'ASSIGN_FLEET_OPERATOR',
        entityType: 'asset',
        entityId: assetId,
        newValue: JSON.stringify({ operatorId, assignmentId: assignment.id }),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Phân công Người vận hành cho phương tiện thành công.',
      assignment,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// API-10: POST /api/v1/admin/maintenance/approve (Approve & Prove Maintenance On-Chain)
router.post('/admin/maintenance/approve', async (req, res) => {
  try {
    const assetId = req.body.asset_id || req.body.assetId;
    const maintenanceId = req.body.maintenance_id || req.body.maintenanceId || `MAINT-${Date.now()}`;
    const garageName = (req.body.garage_name || req.body.garageName || 'Gara BKU Auto Service').trim();
    const invoiceCid =
      (req.body.invoice_cid || req.body.invoiceCid || '').trim() ||
      'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phương tiện.' });
    }
    if (asset.tokenizationStatus !== 'TOKENIZED') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ phương tiện đã đăng ký trên VehicleIdentityRegistry (TOKENIZED) mới ghi bằng chứng bảo dưỡng on-chain.',
      });
    }

    const { vehicleRegistry } = await getCoreContractInstances();
    const tx = await vehicleRegistry.recordMaintenanceProof(
      asset.assetCode,
      maintenanceId,
      garageName,
      invoiceCid
    );
    const receipt = await tx.wait();

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'PROVE_MAINTENANCE_ONCHAIN',
        entityType: 'maintenance',
        entityId: asset.id,
        newValue: JSON.stringify({
          assetCode: asset.assetCode,
          maintenanceId,
          garageName,
          invoiceCid,
          txHash: receipt.hash,
        }),
      },
    });

    return res.json({
      success: true,
      message: `Đã ghi nhận bằng chứng bảo dưỡng bất biến lên VehicleIdentityRegistry cho xe ${asset.assetCode}!`,
      blockchain_data: {
        status: 'SUCCESS',
        transaction_hash: receipt.hash,
        garage_name: garageName,
        invoice_cid: invoiceCid,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/admin/compliance/freeze (ERC-3643 Freeze / Unfreeze wallet on a VehicleShareToken)
router.post('/admin/compliance/freeze', async (req, res) => {
  try {
    const { contractAddress, walletAddress, freeze = true } = req.body;
    if (!ethers.isAddress(contractAddress) || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Địa chỉ hợp đồng hoặc ví không hợp lệ.' });
    }
    const { admin } = await getCoreContractInstances();
    const shareArt = loadContractArtifact('VehicleShareToken');
    const shareToken = new ethers.Contract(contractAddress, shareArt.abi, admin);

    const tx = await shareToken.freezeToken(walletAddress, Boolean(freeze));
    const receipt = await tx.wait();

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: freeze ? 'ERC3643_FREEZE_WALLET' : 'ERC3643_UNFREEZE_WALLET',
        entityType: 'compliance',
        entityId: req.user.id,
        newValue: JSON.stringify({ contractAddress, walletAddress, freeze, txHash: receipt.hash }),
      },
    });

    return res.json({
      success: true,
      message: freeze
        ? `Đã đóng băng quyền giao dịch ERC-3643 đối với ví ${walletAddress.slice(0, 10)}...`
        : `Đã gỡ đóng băng cho ví ${walletAddress.slice(0, 10)}...`,
      txHash: receipt.hash,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
