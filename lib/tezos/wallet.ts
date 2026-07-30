"use client";

import { BeaconWallet } from "@taquito/beacon-wallet";
import { TezosToolkit } from "@taquito/taquito";

/** Public mainnet RPC — TzKT (ecadinfra often fails in browsers) */
export const TEZOS_RPC = "https://rpc.tzkt.io/mainnet";

const DAPP_NAME = "Empress Trash XTZ Airdrop Tool";

let wallet: BeaconWallet | null = null;
let tezos: TezosToolkit | null = null;

export function getTezos(): TezosToolkit {
  if (!tezos) {
    tezos = new TezosToolkit(TEZOS_RPC);
  }
  return tezos;
}

export function getWallet(): BeaconWallet {
  if (typeof window === "undefined") {
    throw new Error("getWallet() may only be called in the browser.");
  }
  if (!wallet) {
    // Beacon v4+: network on the client (not requestPermissions).
    // Cast type — dual NetworkType enums across @airgap packages.
    wallet = new BeaconWallet({
      name: DAPP_NAME,
      network: {
        type: "mainnet" as never,
        rpcUrl: TEZOS_RPC,
      },
    });
    getTezos().setWalletProvider(wallet);
  }
  return wallet;
}

export async function getActiveAddress(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const account = await getWallet().client.getActiveAccount();
    return account?.address ?? null;
  } catch {
    return null;
  }
}

export async function connectWallet(): Promise<string | null> {
  const w = getWallet();
  await w.requestPermissions();
  return getActiveAddress();
}

export async function disconnectWallet(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!wallet) return;
  try {
    if (typeof wallet.disconnect === "function") {
      await wallet.disconnect();
    } else {
      await wallet.client.clearActiveAccount();
    }
  } finally {
    // disconnect() destroys the client — must recreate on next connect
    wallet = null;
    tezos = null;
  }
}
