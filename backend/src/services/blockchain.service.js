import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import { prisma } from '../config/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compiledDir = path.resolve(__dirname, '../../../contracts/compiled');
const deployedJsonPath = path.resolve(__dirname, '../../../contracts/deployed-addresses.json');

export const ADMIN_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// Deterministic demo signer map for seamless browser signing when MetaMask extension is absent
export const DEMO_WALLET_KEYS = {
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266':
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x70997970c51812dc3a010c7d01b50e0d17dc79c8':
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc':
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906':
    '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
};

export function loadContractArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(compiledDir, `${name}.json`), 'utf8'));
}

export function getProvider() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
  return new ethers.JsonRpcProvider(rpcUrl, undefined, { cacheTimeout: -1 });
}

export function getAdminSigner() {
  return new ethers.Wallet(ADMIN_PRIVATE_KEY, getProvider());
}

let cachedCoreAddresses = null;
let bootstrapPromise = null;

export async function ensureCoreContracts() {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      const provider = getProvider();
      await provider.getNetwork(); // Check RPC connectivity
      const admin = getAdminSigner();

      // Check if existing deployed-addresses.json still has live bytecode on this EVM instance
      if (fs.existsSync(deployedJsonPath)) {
        const saved = JSON.parse(fs.readFileSync(deployedJsonPath, 'utf8'));
        const mgrAddr = saved?.contracts?.AssetTokenizationManager;
        if (mgrAddr) {
          const code = await provider.getCode(mgrAddr);
          if (code && code !== '0x') {
            cachedCoreAddresses = saved.contracts;
            return cachedCoreAddresses;
          }
        }
      }

      // Deploy fresh core suite onto live EVM instance & sync existing DB state
      const idArt = loadContractArtifact('OnchainIdentityRegistry');
      const vehArt = loadContractArtifact('VehicleIdentityRegistry');
      const mgrArt = loadContractArtifact('AssetTokenizationManager');
      const shareArt = loadContractArtifact('VehicleShareToken');
      const vaultArt = loadContractArtifact('DividendVault');

      const idReg = await new ethers.ContractFactory(idArt.abi, idArt.bytecode, admin).deploy();
      await idReg.waitForDeployment();
      const idAddr = await idReg.getAddress();

      const vehReg = await new ethers.ContractFactory(vehArt.abi, vehArt.bytecode, admin).deploy();
      await vehReg.waitForDeployment();
      const vehAddr = await vehReg.getAddress();

      const manager = await new ethers.ContractFactory(mgrArt.abi, mgrArt.bytecode, admin).deploy(
        idAddr,
        vehAddr
      );
      await manager.waitForDeployment();
      const mgrAddr = await manager.getAddress();

      await (await vehReg.setAuthorizedManager(mgrAddr, true)).wait();

      // Sync verified KYC users from DB into OnchainIdentityRegistry
      const verifiedUsers = await prisma.user.findMany({
        where: { kycStatus: 'VERIFIED', walletAddress: { not: null } },
      });
      for (const u of verifiedUsers) {
        if (ethers.isAddress(u.walletAddress)) {
          await (await idReg.registerIdentity(u.walletAddress, ethers.id(`KYC_${u.email}`))).wait();
        }
      }

      // Sync already-TOKENIZED DB assets onto live EVM so contracts exist for seeded assets too
      const tokenizedAssets = await prisma.asset.findMany({
        where: { tokenizationStatus: 'TOKENIZED' },
        include: { tokens: { include: { holdings: { include: { investor: true } } } }, documents: true },
      });

      for (const asset of tokenizedAssets) {
        const tokenRec = asset.tokens?.[0];
        if (!tokenRec) continue;
        const cid = asset.documents?.[0]?.ipfsCid || 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
        const totalShares = BigInt(Math.round(tokenRec.totalSupply));

        const tx = await manager.tokenizeAsset(
          asset.assetCode,
          asset.chassisNumber || asset.assetCode,
          asset.licensePlate,
          cid,
          `CarFlow ${asset.assetCode}`,
          tokenRec.tokenSymbol || 'CFRWA',
          totalShares
        );
        const receipt = await tx.wait();
        const bundle = await manager.bundles(asset.assetCode);

        const shareContract = new ethers.Contract(bundle.shareToken, shareArt.abi, admin);
        const vaultContract = new ethers.Contract(bundle.dividendVault, vaultArt.abi, admin);

        // Restore investor holdings on-chain
        for (const h of tokenRec.holdings || []) {
          const invWallet = h.investor?.walletAddress;
          if (invWallet && ethers.isAddress(invWallet) && h.tokenBalance > 0) {
            const verified = await idReg.isVerified(invWallet);
            if (!verified) {
              await (await idReg.registerIdentity(invWallet, ethers.id(`AUTO_${invWallet}`))).wait();
            }
            await (await shareContract.transfer(invWallet, BigInt(Math.round(h.tokenBalance)))).wait();
          }
        }

        // Seed initial operational revenue into DividendVault ($580.00 = 58,000 cents) so Investors have live claimable yield
        await (await vaultContract.depositRevenue(58000n)).wait();

        await prisma.assetToken.update({
          where: { id: tokenRec.id },
          data: {
            contractAddress: bundle.shareToken,
            vaultAddress: bundle.dividendVault,
            mintTxHash: receipt.hash,
          },
        });
      }

      cachedCoreAddresses = {
        OnchainIdentityRegistry: idAddr,
        VehicleIdentityRegistry: vehAddr,
        AssetTokenizationManager: mgrAddr,
      };

      fs.writeFileSync(
        deployedJsonPath,
        JSON.stringify(
          {
            chainId: 1337,
            rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
            adminAddress: admin.address,
            contracts: cachedCoreAddresses,
            deployedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );

      return cachedCoreAddresses;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

export async function getCoreContractInstances() {
  const addrs = await ensureCoreContracts();
  const admin = getAdminSigner();
  const idArt = loadContractArtifact('OnchainIdentityRegistry');
  const vehArt = loadContractArtifact('VehicleIdentityRegistry');
  const mgrArt = loadContractArtifact('AssetTokenizationManager');

  return {
    addresses: addrs,
    admin,
    identityRegistry: new ethers.Contract(addrs.OnchainIdentityRegistry, idArt.abi, admin),
    vehicleRegistry: new ethers.Contract(addrs.VehicleIdentityRegistry, vehArt.abi, admin),
    tokenizationManager: new ethers.Contract(addrs.AssetTokenizationManager, mgrArt.abi, admin),
  };
}
