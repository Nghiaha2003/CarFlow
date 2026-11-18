import { Router } from 'express';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { JsonRpcProvider } from 'ethers';
import { prisma } from '../config/prisma.js';
import { PROJECT_MODULES, INSTALLED_AAS_SKILLS } from '../data/roadmap.js';
import { ensureCoreContracts } from '../services/blockchain.service.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../');

function getGitStatusInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
    let remoteUrl = null;
    try {
      remoteUrl = execSync('git remote get-url origin', { cwd: repoRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
      remoteUrl = null;
    }
    let commits = [];
    try {
      const rawLog = execSync('git log -n 8 --pretty=format:"%h|%s|%cr"', { cwd: repoRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (rawLog) {
        commits = rawLog.split('\n').map((line) => {
          const [hash, subject, relativeTime] = line.split('|');
          return { hash, subject, relativeTime };
        });
      }
    } catch {
      commits = [];
    }
    return { initialized: true, branch, remoteUrl, commits };
  } catch {
    return { initialized: false, branch: 'main', remoteUrl: null, commits: [] };
  }
}

async function checkBlockchainRpc() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
  try {
    const provider = new JsonRpcProvider(rpcUrl, undefined, { cacheTimeout: -1 });
    const network = await Promise.race([
      provider.getNetwork(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800)),
    ]);
    const coreContracts = await ensureCoreContracts();
    const blockNumber = await provider.getBlockNumber();
    return {
      connected: true,
      rpcUrl,
      chainId: Number(network.chainId),
      blockNumber,
      contracts: coreContracts,
    };
  } catch {
    return { connected: false, rpcUrl, chainId: null, contracts: null };
  }
}

router.get('/health', async (_req, res) => {
  try {
    const roleCount = await prisma.role.count();
    const blockchain = await checkBlockchainRpc();
    res.json({
      status: 'ok',
      service: 'CarFlow RWA Backend API',
      timestamp: new Date().toISOString(),
      database: { connected: true, engine: 'Prisma ORM (SQLite local / PostgreSQL ready)', seededRoles: roleCount },
      blockchain,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.get('/system/progress', async (_req, res) => {
  try {
    const [
      roles,
      users,
      assets,
      operatorAssignments,
      documents,
      tokenizationRequests,
      assetTokens,
      tokenTransactions,
      tokenHoldings,
      operationRecords,
      reportLogs,
      auditLogs,
    ] = await Promise.all([
      prisma.role.count(),
      prisma.user.count(),
      prisma.asset.count(),
      prisma.assetOperatorAssignment.count(),
      prisma.assetDocument.count(),
      prisma.tokenizationRequest.count(),
      prisma.assetToken.count(),
      prisma.tokenTransaction.count(),
      prisma.tokenHolding.count(),
      prisma.operationRecord.count(),
      prisma.reportLog.count(),
      prisma.auditLog.count(),
    ]);

    const completedCount = PROJECT_MODULES.filter((m) => m.status === 'completed').length;
    const overallProgress = Math.round(
      PROJECT_MODULES.reduce((acc, m) => acc + m.progress, 0) / PROJECT_MODULES.length
    );

    const blockchain = await checkBlockchainRpc();
    const git = getGitStatusInfo();

    res.json({
      project: {
        name: 'CarFlow RWA',
        thesisTitle: 'Phát triển hệ thống phần mềm quản lý và mã hóa tài sản phương tiện vận tải thực tế vào hệ sinh thái số',
        student: 'Hà Đình Nghĩa (MSSV: 2114174)',
        advisor: 'ThS. Phan Trung Hiếu',
        tokenStandards: ['ERC-3643 (Permissioned RWA Share Token)', 'ERC-4626 (Tokenized Dividend Vault)', 'VehicleIdentityRegistry'],
        completedModules: completedCount,
        totalModules: PROJECT_MODULES.length,
        overallProgress,
      },
      infrastructure: {
        backend: { online: true, url: 'http://localhost:4000' },
        database: {
          online: true,
          engine: 'SQLite via Prisma (12/12 Thesis Tables Active)',
          tables: [
            { name: 'roles', ref: 'Bảng 5.7', count: roles },
            { name: 'users', ref: 'Bảng 5.8', count: users },
            { name: 'assets', ref: 'Bảng 5.9', count: assets },
            { name: 'asset_operator_assignments', ref: 'Bảng 5.10', count: operatorAssignments },
            { name: 'asset_documents', ref: 'Bảng 5.11', count: documents },
            { name: 'tokenization_requests', ref: 'Bảng 5.12', count: tokenizationRequests },
            { name: 'asset_tokens', ref: 'Bảng 5.13', count: assetTokens },
            { name: 'token_transactions', ref: 'Bảng 5.14', count: tokenTransactions },
            { name: 'token_holdings', ref: 'Bảng 5.15', count: tokenHoldings },
            { name: 'operation_records', ref: 'Bảng 5.16', count: operationRecords },
            { name: 'report_logs', ref: 'Bảng 5.17', count: reportLogs },
            { name: 'audit_logs', ref: 'Bảng 5.18', count: auditLogs },
          ],
        },
        blockchain,
        git,
      },
      modules: PROJECT_MODULES,
      skills: INSTALLED_AAS_SKILLS,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.get('/system/preview-overview', async (_req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      include: {
        tokens: true,
        documents: true,
        owner: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ assets });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;
