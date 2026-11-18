import http from 'http';
import { createVM, runTx } from '@ethereumjs/vm';
import { createCustomCommon, Mainnet, Hardfork } from '@ethereumjs/common';
import { createTxFromRLP } from '@ethereumjs/tx';
import {
  Account,
  createAddressFromString,
  hexToBytes,
  bytesToHex,
} from '@ethereumjs/util';
import { keccak256 } from 'ethers';

const PORT = Number(process.env.EVM_PORT || 8545);
const CHAIN_ID = 1337n;

// Standard deterministic dev accounts (matching Hardhat / Besu genesis accounts)
const GENESIS_ACCOUNTS = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Admin (#0)
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Owner (#1)
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Investor (#2)
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Operator (#3)
  '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', // Secondary Investor (#4)
];

function toRpcQty(numOrBigInt) {
  const bi = BigInt(numOrBigInt);
  return '0x' + bi.toString(16);
}

export async function createEvmEngine() {
  const common = createCustomCommon({ chainId: Number(CHAIN_ID) }, Mainnet, {
    hardfork: Hardfork.Cancun,
  });
  const vm = await createVM({ common });

  // Fund genesis accounts with 10,000 ETH each
  const initialBalance = 10000n * 10n ** 18n;
  for (const addrStr of GENESIS_ACCOUNTS) {
    const addr = createAddressFromString(addrStr);
    const acct = new Account(0n, initialBalance);
    await vm.stateManager.putAccount(addr, acct);
  }

  let blockNumber = 1n;
  const txReceipts = new Map();
  const txByHash = new Map();
  const blocksByNum = new Map();

  function makeBlockObj({ num, hash, parentHash, timestamp, gasUsed = 0n, txs = [] }) {
    return {
      number: toRpcQty(num),
      hash,
      parentHash,
      nonce: '0x0000000000000000',
      miner: '0x0000000000000000000000000000000000000000',
      difficulty: '0x0',
      extraData: '0x',
      timestamp: toRpcQty(timestamp),
      gasLimit: toRpcQty(30_000_000n),
      gasUsed: toRpcQty(gasUsed),
      baseFeePerGas: toRpcQty(1_000_000_000n),
      transactions: txs,
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const genesisHash = keccak256(hexToBytes('0x133700'));
  blocksByNum.set(
    0n,
    makeBlockObj({ num: 0n, hash: genesisHash, parentHash: '0x' + '0'.repeat(64), timestamp: nowSec - 60 })
  );
  blocksByNum.set(
    1n,
    makeBlockObj({ num: 1n, hash: keccak256(hexToBytes('0x133701')), parentHash: genesisHash, timestamp: nowSec })
  );

  // Serial execution queue to prevent concurrent stateManager races
  let txQueue = Promise.resolve();

  async function handleRpc(method, params = []) {
    switch (method) {
      case 'eth_chainId':
        return toRpcQty(CHAIN_ID);
      case 'net_version':
        return CHAIN_ID.toString();
      case 'web3_clientVersion':
        return 'CarFlow-BesuEVM/v1.0.0/cancun';
      case 'eth_blockNumber':
        return toRpcQty(blockNumber);
      case 'eth_gasPrice':
        return toRpcQty(1_000_000_000n);
      case 'eth_maxPriorityFeePerGas':
        return toRpcQty(1_000_000_000n);
      case 'eth_feeHistory':
        return {
          oldestBlock: toRpcQty(blockNumber),
          baseFeePerGas: [toRpcQty(1_000_000_000n), toRpcQty(1_000_000_000n)],
          gasUsedRatio: [0.1],
          reward: [[toRpcQty(1_000_000_000n)]],
        };
      case 'eth_getBalance': {
        const addr = createAddressFromString(params[0]);
        const acct = await vm.stateManager.getAccount(addr);
        return toRpcQty(acct ? acct.balance : 0n);
      }
      case 'eth_getTransactionCount': {
        const runNonce = txQueue.then(async () => {
          const addr = createAddressFromString(params[0]);
          const acct = await vm.stateManager.getAccount(addr);
          return toRpcQty(acct ? acct.nonce : 0n);
        });
        txQueue = runNonce.catch(() => {});
        return runNonce;
      }
      case 'eth_getCode': {
        const addr = createAddressFromString(params[0]);
        const code = await vm.stateManager.getCode(addr);
        return code && code.length > 0 ? bytesToHex(code) : '0x';
      }
      case 'eth_estimateGas': {
        const runEst = txQueue.then(async () => {
          const callObj = params[0] || {};
          const caller = callObj.from
            ? createAddressFromString(callObj.from)
            : createAddressFromString(GENESIS_ACCOUNTS[0]);
          const to = callObj.to ? createAddressFromString(callObj.to) : undefined;
          const data = callObj.data ? hexToBytes(callObj.data) : new Uint8Array();
          const value = callObj.value ? BigInt(callObj.value) : 0n;

          await vm.stateManager.checkpoint();
          try {
            const res = await vm.evm.runCall({
              caller,
              to,
              data,
              value,
              gasLimit: 15_000_000n,
            });
            if (res.execResult.exceptionError) {
              const revertMsg = res.execResult.returnValue?.length
                ? bytesToHex(res.execResult.returnValue)
                : res.execResult.exceptionError.error;
              const err = new Error(`Execution reverted: ${revertMsg}`);
              err.data = bytesToHex(res.execResult.returnValue || new Uint8Array());
              throw err;
            }
            const estimated = res.execResult.executionGasUsed + 65_000n;
            return toRpcQty(estimated < 100_000n ? 150_000n : (estimated * 13n) / 10n);
          } finally {
            await vm.stateManager.revert();
          }
        });
        txQueue = runEst.catch(() => {});
        return runEst;
      }
      case 'eth_call': {
        const runRead = txQueue.then(async () => {
          const callObj = params[0] || {};
          const caller = callObj.from
            ? createAddressFromString(callObj.from)
            : createAddressFromString(GENESIS_ACCOUNTS[0]);
          const to = callObj.to ? createAddressFromString(callObj.to) : undefined;
          const data = callObj.data ? hexToBytes(callObj.data) : new Uint8Array();
          const value = callObj.value ? BigInt(callObj.value) : 0n;

          await vm.stateManager.checkpoint();
          try {
            const res = await vm.evm.runCall({
              caller,
              to,
              data,
              value,
              gasLimit: 15_000_000n,
            });
            if (res.execResult.exceptionError) {
              const err = new Error(`Call reverted: ${res.execResult.exceptionError.error}`);
              err.data = bytesToHex(res.execResult.returnValue || new Uint8Array());
              throw err;
            }
            return bytesToHex(res.execResult.returnValue || new Uint8Array());
          } finally {
            await vm.stateManager.revert();
          }
        });
        txQueue = runRead.catch(() => {});
        return runRead;
      }
      case 'eth_sendRawTransaction': {
        const rawHex = params[0];
        const runTask = txQueue.then(async () => {
          const rawBytes = hexToBytes(rawHex);
          const tx = createTxFromRLP(rawBytes, { common });
          const txHash = keccak256(rawBytes);

          const result = await runTx(vm, {
            tx,
            skipBlockGasLimitValidation: true,
            skipHardForkValidation: true,
          });

          blockNumber += 1n;
          const blockHash = keccak256(hexToBytes(txHash));
          const nowHex = toRpcQty(Math.floor(Date.now() / 1000));
          const senderStr = tx.getSenderAddress().toString();
          const toStr = tx.to ? tx.to.toString() : null;
          const createdAddr = result.createdAddress ? result.createdAddress.toString() : null;
          const statusOk = !result.execResult.exceptionError;

          const formattedLogs = (result.receipt.logs || []).map((logTuple, idx) => {
            const [logAddr, topics, logData] = logTuple;
            return {
              address: bytesToHex(logAddr),
              topics: topics.map((t) => bytesToHex(t)),
              data: bytesToHex(logData),
              blockNumber: toRpcQty(blockNumber),
              transactionHash: txHash,
              transactionIndex: '0x0',
              blockHash,
              logIndex: toRpcQty(idx),
              removed: false,
            };
          });

          const receipt = {
            transactionHash: txHash,
            transactionIndex: '0x0',
            blockHash,
            blockNumber: toRpcQty(blockNumber),
            from: senderStr,
            to: toStr,
            cumulativeGasUsed: toRpcQty(result.totalGasSpent),
            gasUsed: toRpcQty(result.totalGasSpent),
            effectiveGasPrice: toRpcQty(1_000_000_000n),
            contractAddress: createdAddr,
            logs: formattedLogs,
            logsBloom: '0x' + '0'.repeat(512),
            status: statusOk ? '0x1' : '0x0',
            type: toRpcQty(tx.type || 0),
          };

          const txObj = {
            hash: txHash,
            nonce: toRpcQty(tx.nonce),
            blockHash,
            blockNumber: toRpcQty(blockNumber),
            transactionIndex: '0x0',
            from: senderStr,
            to: toStr,
            value: toRpcQty(tx.value),
            gas: toRpcQty(tx.gasLimit),
            gasPrice: toRpcQty(1_000_000_000n),
            input: bytesToHex(tx.data),
            v: toRpcQty(tx.v ?? 0n),
            r: toRpcQty(tx.r ?? 0n),
            s: toRpcQty(tx.s ?? 0n),
            type: toRpcQty(tx.type || 0),
            chainId: toRpcQty(CHAIN_ID),
          };

          txReceipts.set(txHash.toLowerCase(), receipt);
          txByHash.set(txHash.toLowerCase(), txObj);
          blocksByNum.set(
            blockNumber,
            makeBlockObj({
              num: blockNumber,
              hash: blockHash,
              parentHash: blocksByNum.get(blockNumber - 1n)?.hash || genesisHash,
              timestamp: Math.floor(Date.now() / 1000),
              gasUsed: result.totalGasSpent,
              txs: [txHash],
            })
          );

          if (!statusOk) {
            const err = new Error(`Transaction reverted: ${result.execResult.exceptionError.error}`);
            err.data = bytesToHex(result.execResult.returnValue || new Uint8Array());
            throw err;
          }

          return txHash;
        });
        txQueue = runTask.catch(() => {});
        return runTask;
      }
      case 'eth_getTransactionReceipt':
        return txReceipts.get((params[0] || '').toLowerCase()) || null;
      case 'eth_getTransactionByHash':
        return txByHash.get((params[0] || '').toLowerCase()) || null;
      case 'eth_getBlockByNumber': {
        const tag = params[0];
        const target =
          tag === 'latest' || tag === 'pending'
            ? blockNumber
            : tag === 'earliest'
            ? 0n
            : BigInt(tag || blockNumber);
        return blocksByNum.get(target) || blocksByNum.get(blockNumber);
      }
      default:
        return null;
    }
  }

  return { handleRpc };
}

export async function startRpcServer(port = PORT) {
  const { handleRpc } = await createEvmEngine();

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const processSingle = async (item) => {
          try {
            const result = await handleRpc(item.method, item.params);
            return { jsonrpc: '2.0', id: item.id, result };
          } catch (err) {
            return {
              jsonrpc: '2.0',
              id: item.id,
              error: { code: -32000, message: err.message, data: err.data },
            };
          }
        };

        const responseData = Array.isArray(payload)
          ? await Promise.all(payload.map(processSingle))
          : await processSingle(payload);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responseData));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: err.message } }));
      }
    });
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  console.log(`⛓  CarFlow Besu-Compatible EVM Node listening on http://127.0.0.1:${port} (Chain ID: ${CHAIN_ID})`);
  return server;
}

if (process.argv[1] && process.argv[1].endsWith('evm-rpc-server.js')) {
  startRpcServer(PORT);
}
