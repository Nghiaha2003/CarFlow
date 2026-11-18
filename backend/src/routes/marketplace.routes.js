import { Router } from 'express';
import { ethers } from 'ethers';
import { prisma } from '../config/prisma.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import {
  DEMO_WALLET_KEYS,
  getCoreContractInstances,
  getProvider,
  loadContractArtifact,
} from '../services/blockchain.service.js';

const router = Router();

// API-07: GET /api/v1/marketplace/assets
router.get('/marketplace/assets', async (req, res) => {
  try {
    const segment = (req.query.segment || 'ALL').trim();
    const search = (req.query.search || '').trim().toLowerCase();

    const assets = await prisma.asset.findMany({
      include: {
        tokens: {
          include: {
            holdings: true,
          },
        },
        documents: true,
        owner: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = assets.filter((a) => {
      if (segment !== 'ALL' && a.vehicleSegment.toLowerCase() !== segment.toLowerCase()) {
        return false;
      }
      if (search) {
        const hay = `${a.vehicleName} ${a.assetCode} ${a.licensePlate} ${a.location} ${a.tokens?.[0]?.contractAddress || ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    return res.json({ success: true, assets: filtered });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/marketplace/assets/:id (Detailed Asset & Financial Structure - Fig 5.18)
router.get('/marketplace/assets/:id', async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { fullName: true, email: true } },
        documents: true,
        tokens: {
          include: {
            holdings: { include: { investor: { select: { id: true, fullName: true, walletAddress: true } } } },
            transactions: {
              include: {
                fromUser: { select: { fullName: true } },
                toUser: { select: { fullName: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
        operationRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 8,
        },
      },
    });

    if (!asset) {
      return res.status(404).json({ success: false, code: 'ASSET_NOT_FOUND', message: 'Không tìm thấy xe.' });
    }

    let onchainInfo = null;
    if (asset.tokenizationStatus === 'TOKENIZED') {
      try {
        const { vehicleRegistry } = await getCoreContractInstances();
        const info = await vehicleRegistry.getVehicleInfo(asset.assetCode);
        onchainInfo = {
          assetId: info.assetId,
          vin: info.vin,
          licensePlate: info.licensePlate,
          ipfsMetadataHash: info.ipfsMetadataHash,
          registeredAt: Number(info.registeredAt),
        };
      } catch {
        onchainInfo = null;
      }
    }

    return res.json({ success: true, asset, onchainInfo });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// API-08: POST /api/v1/marketplace/invest (Buy ERC-3643 Vehicle Shares)
router.post('/marketplace/invest', authenticateJWT, async (req, res) => {
  try {
    const assetId = req.body.asset_id || req.body.assetId;
    const shareAmount = Math.floor(Number(req.body.share_amount ?? req.body.shareAmount ?? 0));

    if (!assetId || shareAmount <= 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SHARE_AMOUNT',
        message: 'Số lượng cổ phần đầu tư phải là số nguyên dương.',
      });
    }

    const investor = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!investor.walletAddress || !ethers.isAddress(investor.walletAddress)) {
      return res.status(400).json({
        success: false,
        code: 'WALLET_REQUIRED',
        message: 'Vui lòng liên kết địa chỉ ví Web3 trong mục Tài khoản & KYC trước khi đầu tư.',
      });
    }

    if (investor.kycStatus !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        code: 'ERC3643_KYC_NOT_VERIFIED',
        message: 'Từ chối bởi chuẩn tuân thủ ERC-3643: Ví của bạn chưa được xác thực KYC ONCHAINID.',
      });
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { tokens: true },
    });
    const tokenRecord = asset?.tokens?.[0];
    if (!asset || !tokenRecord || asset.tokenizationStatus !== 'TOKENIZED') {
      return res.status(400).json({
        success: false,
        code: 'ASSET_NOT_TOKENIZED',
        message: 'Phương tiện này chưa mở bán cổ phần trên chuỗi khối.',
      });
    }

    if (shareAmount > tokenRecord.availableSupply) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_AVAILABLE_SHARES',
        message: `Chỉ còn ${tokenRecord.availableSupply.toLocaleString()} cổ phần khả dụng để mua.`,
      });
    }

    const { admin, identityRegistry } = await getCoreContractInstances();
    // Ensure investor wallet is registered on OnchainIdentityRegistry
    const isVerifiedOnchain = await identityRegistry.isVerified(investor.walletAddress);
    if (!isVerifiedOnchain) {
      await (
        await identityRegistry.registerIdentity(investor.walletAddress, ethers.id(`KYC_${investor.id}`))
      ).wait();
    }

    const shareArt = loadContractArtifact('VehicleShareToken');
    const shareContract = new ethers.Contract(tokenRecord.contractAddress, shareArt.abi, admin);

    const tx = await shareContract.transfer(investor.walletAddress, BigInt(shareAmount));
    const receipt = await tx.wait();

    const totalCost = shareAmount * tokenRecord.unitPrice;

    await prisma.assetToken.update({
      where: { id: tokenRecord.id },
      data: { availableSupply: tokenRecord.availableSupply - shareAmount },
    });

    const existingHolding = await prisma.tokenHolding.findUnique({
      where: {
        investorId_assetTokenId: {
          investorId: investor.id,
          assetTokenId: tokenRecord.id,
        },
      },
    });

    if (existingHolding) {
      await prisma.tokenHolding.update({
        where: { id: existingHolding.id },
        data: { tokenBalance: existingHolding.tokenBalance + shareAmount },
      });
    } else {
      await prisma.tokenHolding.create({
        data: {
          investorId: investor.id,
          assetTokenId: tokenRecord.id,
          tokenBalance: shareAmount,
        },
      });
    }

    const txRecord = await prisma.tokenTransaction.create({
      data: {
        assetTokenId: tokenRecord.id,
        fromUserId: null,
        toUserId: investor.id,
        transactionType: 'buy',
        tokenAmount: shareAmount,
        unitPrice: tokenRecord.unitPrice,
        totalValue: totalCost,
        blockchainTxHash: req.body.client_tx_hash || receipt.hash,
        transactionStatus: 'success',
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: investor.id,
        action: 'INVEST_ERC3643_SHARES',
        entityType: 'transaction',
        entityId: txRecord.id,
        newValue: JSON.stringify({
          assetCode: asset.assetCode,
          shareAmount,
          totalCost,
          txHash: receipt.hash,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Đầu tư thành công ${shareAmount.toLocaleString()} cổ phần ${tokenRecord.tokenSymbol} ($${totalCost.toLocaleString()}) trên mạng EVM!`,
      data: {
        transaction_id: txRecord.id,
        blockchain_tx_hash: receipt.hash,
        shares_purchased: shareAmount,
        total_paid_usd: totalCost,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'INVESTMENT_TX_FAILED',
      message: err.message,
    });
  }
});

// POST /api/v1/marketplace/transfer (Secondary Peer-to-Peer ERC-3643 Compliant Transfer)
router.post('/marketplace/transfer', authenticateJWT, async (req, res) => {
  try {
    const { assetTokenId, recipientEmailOrWallet, shareAmount } = req.body;
    const qty = Math.floor(Number(shareAmount || 0));
    if (!assetTokenId || !recipientEmailOrWallet || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ người nhận và số cổ phần (> 0).' });
    }

    const sender = await prisma.user.findUnique({ where: { id: req.user.id } });
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { email: recipientEmailOrWallet.trim().toLowerCase() },
          { walletAddress: recipientEmailOrWallet.trim() },
        ],
      },
    });

    if (!recipient || !recipient.walletAddress) {
      return res.status(404).json({
        success: false,
        code: 'RECIPIENT_NOT_FOUND',
        message: 'Không tìm thấy tài khoản người nhận hoặc người nhận chưa liên kết ví Web3.',
      });
    }

    if (recipient.id === sender.id) {
      return res.status(400).json({ success: false, message: 'Không thể tự chuyển nhượng cho chính mình.' });
    }

    const holding = await prisma.tokenHolding.findUnique({
      where: {
        investorId_assetTokenId: {
          investorId: sender.id,
          assetTokenId,
        },
      },
      include: { assetToken: { include: { asset: true } } },
    });

    if (!holding || holding.tokenBalance < qty) {
      return res.status(400).json({
        success: false,
        message: `Số dư cổ phần của bạn không đủ (Hiện có: ${holding?.tokenBalance || 0}).`,
      });
    }

    await getCoreContractInstances();
    const provider = getProvider();
    const shareArt = loadContractArtifact('VehicleShareToken');

    // Execute real on-chain transfer using demo key if available, or forceTransfer only if not demo wallet?
    // Wait: if recipient is NOT KYC verified on-chain, BOTH transfer() and forceTransfer() enforce isVerified(to) and revert!
    const senderPk = DEMO_WALLET_KEYS[(sender.walletAddress || '').toLowerCase()];
    let receipt;
    try {
      if (senderPk) {
        const senderSigner = new ethers.Wallet(senderPk, provider);
        const shareAsSender = new ethers.Contract(holding.assetToken.contractAddress, shareArt.abi, senderSigner);
        const tx = await shareAsSender.transfer(recipient.walletAddress, BigInt(qty));
        receipt = await tx.wait();
      } else {
        const { admin } = await getCoreContractInstances();
        const shareAsAdmin = new ethers.Contract(holding.assetToken.contractAddress, shareArt.abi, admin);
        const tx = await shareAsAdmin.forceTransfer(sender.walletAddress, recipient.walletAddress, BigInt(qty));
        receipt = await tx.wait();
      }
    } catch (chainErr) {
      return res.status(403).json({
        success: false,
        code: 'ERC3643_COMPLIANCE_REVERTED',
        message: `Hợp đồng thông minh VehicleShareToken (ERC-3643) đã CHẶN giao dịch: Ví người nhận (${recipient.walletAddress.slice(0, 8)}...) chưa xác thực KYC ONCHAINID hoặc đang bị đóng băng!`,
        detail: chainErr.message,
      });
    }

    await prisma.tokenHolding.update({
      where: { id: holding.id },
      data: { tokenBalance: holding.tokenBalance - qty },
    });

    const recHolding = await prisma.tokenHolding.findUnique({
      where: {
        investorId_assetTokenId: {
          investorId: recipient.id,
          assetTokenId,
        },
      },
    });
    if (recHolding) {
      await prisma.tokenHolding.update({
        where: { id: recHolding.id },
        data: { tokenBalance: recHolding.tokenBalance + qty },
      });
    } else {
      await prisma.tokenHolding.create({
        data: {
          investorId: recipient.id,
          assetTokenId,
          tokenBalance: qty,
        },
      });
    }

    const txRec = await prisma.tokenTransaction.create({
      data: {
        assetTokenId,
        fromUserId: sender.id,
        toUserId: recipient.id,
        transactionType: 'transfer',
        tokenAmount: qty,
        unitPrice: holding.assetToken.unitPrice,
        totalValue: qty * holding.assetToken.unitPrice,
        blockchainTxHash: receipt.hash,
        transactionStatus: 'success',
      },
    });

    return res.json({
      success: true,
      message: `Chuyển nhượng tuân thủ ERC-3643 thành công ${qty} cổ phần tới ${recipient.fullName}!`,
      txHash: receipt.hash,
      transactionId: txRec.id,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/marketplace/transactions
router.get('/marketplace/transactions', async (_req, res) => {
  try {
    const transactions = await prisma.tokenTransaction.findMany({
      include: {
        assetToken: { include: { asset: { select: { assetCode: true, vehicleName: true } } } },
        fromUser: { select: { fullName: true, walletAddress: true } },
        toUser: { select: { fullName: true, walletAddress: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ success: true, transactions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
