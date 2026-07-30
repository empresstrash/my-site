"use client";

import type { WalletParamsWithKind } from "@taquito/taquito";
import { getTezos } from "./wallet";

export interface Fa2Transfer {
  fa: string;
  tokenId: string;
  to: string;
  amount: number;
}

interface Fa2TransferTx {
  to_: string;
  token_id: number;
  amount: number;
}

/**
 * Recipients packed into one wallet signature (one Beacon approval).
 *
 * Tezos has no hard “200 recipients” constant — the real caps are:
 * - ~1.04M gas per operation
 * - ~32KB op data size
 * - wallet/Beacon timeouts on huge batches
 *
 * Community batch tools (Pure Spider era, nftbiker-style) usually land
 * around 100–200 destinations per signed op. 150 is a safe default for
 * standard multi-asset FA2 (HEN / objkt collections) without on-transfer hooks.
 */
export const MAX_RECIPIENTS_PER_SIGNATURE = 150;

/**
 * Destinations per single FA2 `transfer` entrypoint call inside one op.
 * Multiple transfer calls can share one signed batch (counter + gas packing).
 * 50 keeps a single entrypoint well under gas for typical NFT contracts.
 */
export const TXS_PER_TRANSFER_CALL = 50;

export function planRecipientBatches<T>(
  items: T[],
  maxPerBatch = MAX_RECIPIENTS_PER_SIGNATURE,
): T[][] {
  if (items.length === 0) return [];
  const size = Math.max(1, maxPerBatch);
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export function estimateSigningBatches(
  recipientCount: number,
  maxPerBatch = MAX_RECIPIENTS_PER_SIGNATURE,
): number {
  if (recipientCount <= 0) return 0;
  return Math.ceil(recipientCount / Math.max(1, maxPerBatch));
}

export async function buildFa2BatchTransfer(
  sender: string,
  transfers: Fa2Transfer[],
  txsPerCall = TXS_PER_TRANSFER_CALL,
): Promise<WalletParamsWithKind[]> {
  if (transfers.length === 0) return [];

  const byContract = new Map<string, Fa2TransferTx[]>();
  for (const t of transfers) {
    const amount = Math.floor(Number(t.amount));
    if (!/^\d+$/.test(t.tokenId) || !Number.isFinite(amount) || amount < 1) {
      throw new Error(`Invalid transfer: ${t.to} amount=${t.amount} tokenId=${t.tokenId}`);
    }
    const txs = byContract.get(t.fa) ?? [];
    txs.push({
      to_: t.to,
      token_id: Number(t.tokenId),
      amount,
    });
    byContract.set(t.fa, txs);
  }

  const tezos = getTezos();
  const ops: WalletParamsWithKind[] = [];

  for (const [fa, txs] of byContract) {
    const contract = await tezos.wallet.at(fa);
    for (let i = 0; i < txs.length; i += txsPerCall) {
      const chunk = txs.slice(i, i + txsPerCall);
      const params = contract.methodsObject
        .transfer([{ from_: sender, txs: chunk }])
        .toTransferParams();
      ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
    }
  }

  return ops;
}

export interface SendResult {
  opHash: string;
}

export async function sendBatch(
  ops: WalletParamsWithKind[],
  opts: { waitConfirmation?: boolean } = {},
): Promise<SendResult> {
  if (ops.length === 0) throw new Error("No operations to send");
  const tezos = getTezos();
  const op = await tezos.wallet.batch(ops).send();
  if (opts.waitConfirmation) await op.confirmation(1);
  return { opHash: op.opHash };
}

/**
 * Send one signature-batch of transfers (≤ MAX_RECIPIENTS_PER_SIGNATURE recommended).
 * Waits for chain inclusion so the next signature sees an updated counter.
 */
export async function sendRecipientBatch(
  sender: string,
  transfers: Fa2Transfer[],
): Promise<SendResult> {
  const ops = await buildFa2BatchTransfer(sender, transfers);
  return sendBatch(ops, { waitConfirmation: true });
}

/**
 * Send all transfers, auto-split into signing batches of `maxPerSignature`.
 * Calls onProgress after each successful batch.
 * On failure, throws with `sentHashes` + `failedAtBatch` attached when possible.
 */
export async function sendAllTransfers(
  sender: string,
  transfers: Fa2Transfer[],
  opts: {
    maxPerSignature?: number;
    onProgress?: (info: {
      done: number;
      total: number;
      opHash: string;
      recipientsInBatch: number;
    }) => void;
  } = {},
): Promise<{ hashes: string[]; batches: number }> {
  const max = opts.maxPerSignature ?? MAX_RECIPIENTS_PER_SIGNATURE;
  const batches = planRecipientBatches(transfers, max);
  const hashes: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;
    try {
      // Wait for inclusion between batches so wallet counter stays in sync
      const ops = await buildFa2BatchTransfer(sender, batch);
      const { opHash } = await sendBatch(ops, {
        waitConfirmation: i < batches.length - 1 || batches.length > 1,
      });
      hashes.push(opHash);
      opts.onProgress?.({
        done: i + 1,
        total: batches.length,
        opHash,
        recipientsInBatch: batch.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      const e = new Error(
        hashes.length > 0
          ? `Stopped at batch ${i + 1}/${batches.length}: ${message}. ${hashes.length} batch(es) already confirmed — do not re-send those recipients.`
          : message,
      ) as Error & { sentHashes: string[]; failedAtBatch: number };
      e.sentHashes = hashes;
      e.failedAtBatch = i + 1;
      throw e;
    }
  }

  return { hashes, batches: batches.length };
}

/** Read FA2 balance of `owner` for a single token via TzKT. */
export async function getFa2Balance(
  fa: string,
  tokenId: string,
  owner: string,
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.tzkt.io/v1/tokens/balances?account=${owner}&token.contract=${fa}&token.tokenId=${tokenId}&limit=1`,
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ balance?: string }>;
    if (!rows[0]?.balance) return 0;
    return Number(rows[0].balance);
  } catch {
    return null;
  }
}
