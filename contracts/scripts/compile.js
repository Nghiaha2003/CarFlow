import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../src');
const outDir = path.resolve(__dirname, '../compiled');
fs.mkdirSync(outDir, { recursive: true });

const contractFiles = [
  'OnchainIdentityRegistry.sol',
  'VehicleIdentityRegistry.sol',
  'VehicleShareToken.sol',
  'DividendVault.sol',
  'AssetTokenizationManager.sol',
];

const sources = {};
for (const file of contractFiles) {
  sources[file] = {
    content: fs.readFileSync(path.join(srcDir, file), 'utf8'),
  };
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    evmVersion: 'cancun',
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

console.log('Compiling CarFlow RWA Solidity 0.8.24 smart contracts...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasFatal = false;
  for (const err of output.errors) {
    console.log(`[${err.severity.toUpperCase()}] ${err.formattedMessage}`);
    if (err.severity === 'error') hasFatal = true;
  }
  if (hasFatal) process.exit(1);
}

for (const file of Object.keys(output.contracts)) {
  for (const contractName of Object.keys(output.contracts[file])) {
    const c = output.contracts[file][contractName];
    if (!c.evm?.bytecode?.object) continue; // skip interfaces
    const artifact = {
      contractName,
      sourceName: file,
      abi: c.abi,
      bytecode: `0x${c.evm.bytecode.object}`,
    };
    fs.writeFileSync(
      path.join(outDir, `${contractName}.json`),
      JSON.stringify(artifact, null, 2)
    );
    console.log(`✔ Compiled ${contractName} -> compiled/${contractName}.json`);
  }
}
