import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import { startRpcServer } from './evm-rpc-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compiledDir = path.resolve(__dirname, '../compiled');

function loadArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(compiledDir, `${name}.json`), 'utf8'));
}

// Deterministic Hardhat/Besu dev private keys matching GENESIS_ACCOUNTS
const ADMIN_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const INVESTOR_PK = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
const UNVERIFIED_PK = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6';

async function runTests() {
  console.log('🧪 Starting CarFlow RWA Smart Contract Test Suite...');
  const server = await startRpcServer(18545);

  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:18545', undefined, {
      cacheTimeout: -1,
    });
    const admin = new ethers.Wallet(ADMIN_PK, provider);
    const investor = new ethers.Wallet(INVESTOR_PK, provider);
    const unverified = new ethers.Wallet(UNVERIFIED_PK, provider);

    const idArtifact = loadArtifact('OnchainIdentityRegistry');
    const vehArtifact = loadArtifact('VehicleIdentityRegistry');
    const mgrArtifact = loadArtifact('AssetTokenizationManager');
    const shareArtifact = loadArtifact('VehicleShareToken');
    const vaultArtifact = loadArtifact('DividendVault');

    // 1. Deploy Core Registries & Manager
    const IdFactory = new ethers.ContractFactory(idArtifact.abi, idArtifact.bytecode, admin);
    const idReg = await IdFactory.deploy();
    await idReg.waitForDeployment();

    const VehFactory = new ethers.ContractFactory(vehArtifact.abi, vehArtifact.bytecode, admin);
    const vehReg = await VehFactory.deploy();
    await vehReg.waitForDeployment();

    const MgrFactory = new ethers.ContractFactory(mgrArtifact.abi, mgrArtifact.bytecode, admin);
    const manager = await MgrFactory.deploy(await idReg.getAddress(), await vehReg.getAddress());
    await manager.waitForDeployment();

    // Authorize AssetTokenizationManager on VehicleIdentityRegistry
    await (await vehReg.setAuthorizedManager(await manager.getAddress(), true)).wait();
    console.log('✔ Test 1 Passed: Deployed Registries & AssetTokenizationManager');

    // 2. Tokenize Vehicle (CF-EV-1001, 1000 shares)
    const txTokenize = await manager.tokenizeAsset(
      'CF-EV-1001',
      'RLNVF9PLUS2025VN01',
      '51K-889.24',
      'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      'CarFlow VF9 Share',
      'CFVF9',
      1000n
    );
    await txTokenize.wait();

    const bundle = await manager.bundles('CF-EV-1001');
    assert.strictEqual(bundle.active, true);
    const vehInfo = await vehReg.getVehicleInfo('CF-EV-1001');
    assert.strictEqual(vehInfo.vin, 'RLNVF9PLUS2025VN01');
    console.log('✔ Test 2 Passed: Atomic Vehicle Registration + ERC-3643 ShareToken + ERC-4626 Vault Deployment');

    const shareToken = new ethers.Contract(bundle.shareToken, shareArtifact.abi, admin);
    const vault = new ethers.Contract(bundle.dividendVault, vaultArtifact.abi, admin);

    // 3. Verify ERC-3643 Compliance: Transfer to unverified wallet MUST revert!
    let reverted = false;
    try {
      await (await shareToken.transfer(unverified.address, 100n)).wait();
    } catch {
      reverted = true;
    }
    assert.strictEqual(reverted, true, 'Transfer to non-KYC wallet must revert');
    console.log('✔ Test 3 Passed: ERC-3643 Compliance blocked transfer to non-KYC wallet');

    // 4. Verify Investor KYC & transfer 400 shares (40% ownership)
    await (await idReg.registerIdentity(investor.address, ethers.id('VN_CCCD_079203004567'))).wait();
    await (await shareToken.transfer(investor.address, 400n)).wait();
    assert.strictEqual(await shareToken.balanceOf(investor.address), 400n);
    console.log('✔ Test 4 Passed: KYC Whitelisted Investor received 400 ERC-3643 shares (40%)');

    // 5. Deposit $1,000.00 (100,000 cents) net fleet revenue into DividendVault -> Investor claims 40% ($400.00 = 40,000 cents)
    await (await vault.depositRevenue(100000n)).wait();
    const pending = await vault.claimableYield(investor.address);
    assert.strictEqual(pending, 40000n);

    const vaultAsInvestor = vault.connect(investor);
    await (await vaultAsInvestor.claimDividend(investor.address)).wait();
    assert.strictEqual(await vault.claimableYield(investor.address), 0n);
    assert.strictEqual(await vault.totalClaimedByUser(investor.address), 40000n);
    console.log('✔ Test 5 Passed: ERC-4626 DividendVault pro-rata distribution & claim ($400.00 exact)');

    // 6. Test Freeze & ForceTransfer + Maintenance Proof (API-10)
    await (await shareToken.freezeToken(investor.address, true)).wait();
    let frozenBlocked = false;
    try {
      await (await shareToken.connect(investor).transfer(admin.address, 10n)).wait();
    } catch {
      frozenBlocked = true;
    }
    assert.strictEqual(frozenBlocked, true);
    await (await shareToken.forceTransfer(investor.address, admin.address, 50n)).wait();
    assert.strictEqual(await shareToken.balanceOf(investor.address), 350n);

    await (await vehReg.recordMaintenanceProof('CF-EV-1001', 'MAINT-01', 'Gara BKU Auto', 'bafkreimaint01')).wait();
    assert.strictEqual(await vehReg.getMaintenanceCount('CF-EV-1001'), 1n);
    console.log('✔ Test 6 Passed: Freeze, ForceTransfer & Immutable Maintenance Proof verified');

    console.log('\n🎉 ALL 6/6 SMART CONTRACT TESTS PASSED ON EVM ENGINE!');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
