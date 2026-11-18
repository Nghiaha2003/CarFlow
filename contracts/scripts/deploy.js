import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compiledDir = path.resolve(__dirname, '../compiled');
const outFile = path.resolve(__dirname, '../deployed-addresses.json');

const ADMIN_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

function loadArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(compiledDir, `${name}.json`), 'utf8'));
}

async function main() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { cacheTimeout: -1 });
  const admin = new ethers.Wallet(ADMIN_PK, provider);

  console.log(`Deploying CarFlow RWA Smart Contracts to ${rpcUrl} using Admin ${admin.address}...`);

  const idArt = loadArtifact('OnchainIdentityRegistry');
  const vehArt = loadArtifact('VehicleIdentityRegistry');
  const mgrArt = loadArtifact('AssetTokenizationManager');

  const idReg = await new ethers.ContractFactory(idArt.abi, idArt.bytecode, admin).deploy();
  await idReg.waitForDeployment();
  const identityRegistryAddress = await idReg.getAddress();

  const vehReg = await new ethers.ContractFactory(vehArt.abi, vehArt.bytecode, admin).deploy();
  await vehReg.waitForDeployment();
  const vehicleRegistryAddress = await vehReg.getAddress();

  const manager = await new ethers.ContractFactory(mgrArt.abi, mgrArt.bytecode, admin).deploy(
    identityRegistryAddress,
    vehicleRegistryAddress
  );
  await manager.waitForDeployment();
  const tokenizationManagerAddress = await manager.getAddress();

  await (await vehReg.setAuthorizedManager(tokenizationManagerAddress, true)).wait();

  const deploymentInfo = {
    chainId: 1337,
    rpcUrl,
    adminAddress: admin.address,
    contracts: {
      OnchainIdentityRegistry: identityRegistryAddress,
      VehicleIdentityRegistry: vehicleRegistryAddress,
      AssetTokenizationManager: tokenizationManagerAddress,
    },
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(outFile, JSON.stringify(deploymentInfo, null, 2));
  console.log('✔ Deployed Core RWA Contracts:', deploymentInfo.contracts);
}

main().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
