"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  connectWallet,
  disconnectWallet,
  getActiveAddress,
} from "@/lib/tezos/wallet";
import {
  estimateSigningBatches,
  getFa2Balance,
  MAX_RECIPIENTS_PER_SIGNATURE,
  sendAllTransfers,
} from "@/lib/tezos/transfer";
import {
  parseRecipientsCsv,
  shortAddress,
  type CsvRecipient,
} from "@/lib/tezos/parse";

type Mode = "holders" | "csv";
/** match = 1 airdrop edition per edition held of the source token */
type AmountMode = "match" | "one" | "custom";

interface TokenCard {
  name: string | null;
  tokenId: string;
  faContract: string;
  supply: number;
  image: string | null;
}

interface HolderRow {
  address: string;
  quantity: number;
  alias: string | null;
}

interface RecipientRow {
  address: string;
  amount: number;
  alias?: string | null;
  held?: number;
}

export default function AirdropTool() {
  const [mode, setMode] = useState<Mode>("holders");
  const [address, setAddress] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [walletError, setWalletError] = useState<string | null>(null);

  // Holders mode — empty until user pastes URLs
  const [holdersUrl, setHoldersUrl] = useState("");
  const [airdropUrl, setAirdropUrl] = useState("");
  const [sourceToken, setSourceToken] = useState<TokenCard | null>(null);
  const [airdropToken, setAirdropToken] = useState<TokenCard | null>(null);
  const [holders, setHolders] = useState<HolderRow[]>([]);
  const [holdersStats, setHoldersStats] = useState<{
    uniqueHolders: number;
    totalEditions: number;
    skipped: number;
  } | null>(null);
  const [loadingHolders, setLoadingHolders] = useState(false);
  const [loadingAirdrop, setLoadingAirdrop] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Amount rules — default: same count as they hold of the source token
  const [amountMode, setAmountMode] = useState<AmountMode>("match");
  const [customAmount, setCustomAmount] = useState("1");
  const [excludeSelf, setExcludeSelf] = useState(true);

  // CSV mode
  const [csvText, setCsvText] = useState("");
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  // Send state
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    hashes?: string[];
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Always start blank (defeats browser form autofill / stale tab state)
  useEffect(() => {
    setHoldersUrl("");
    setAirdropUrl("");
    setCsvText("");
    setSourceToken(null);
    setAirdropToken(null);
    setHolders([]);
    setHoldersStats(null);
  }, []);

  // Restore wallet session only
  useEffect(() => {
    let cancelled = false;
    void getActiveAddress().then((addr) => {
      if (cancelled) return;
      if (addr) {
        setAddress(addr);
        setWalletStatus("connected");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setWalletStatus("connecting");
    setWalletError(null);
    try {
      const addr = await connectWallet();
      if (addr) {
        setAddress(addr);
        setWalletStatus("connected");
      } else {
        setWalletStatus("idle");
      }
    } catch (err) {
      setWalletStatus("error");
      setWalletError(err instanceof Error ? err.message : "Failed to connect");
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setAddress(null);
    setWalletStatus("idle");
    setWalletError(null);
    setBalance(null);
  }, []);

  const loadHolders = useCallback(async () => {
    if (!holdersUrl.trim()) {
      setFetchError("Paste an objkt URL for the work whose holders should receive the airdrop.");
      return;
    }
    setFetchError(null);
    setLoadingHolders(true);
    setSourceToken(null);
    setHolders([]);
    setHoldersStats(null);
    try {
      const res = await fetch(
        `/api/objkt/holders?url=${encodeURIComponent(holdersUrl.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load holders");
      setSourceToken(data.token);
      setHolders(data.holders);
      setHoldersStats(data.stats);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load holders");
    } finally {
      setLoadingHolders(false);
    }
  }, [holdersUrl]);

  const loadAirdropToken = useCallback(async () => {
    if (!airdropUrl.trim()) {
      setFetchError("Paste an objkt URL for the work you are airdropping.");
      return;
    }
    setFetchError(null);
    setLoadingAirdrop(true);
    setAirdropToken(null);
    setBalance(null);
    try {
      const res = await fetch(
        `/api/objkt/token?url=${encodeURIComponent(airdropUrl.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load airdrop token");
      setAirdropToken(data.token);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load airdrop token");
    } finally {
      setLoadingAirdrop(false);
    }
  }, [airdropUrl]);

  // Refresh FA2 balance when wallet + airdrop token are known
  useEffect(() => {
    if (!address || !airdropToken) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    void getFa2Balance(
      airdropToken.faContract,
      airdropToken.tokenId,
      address,
    ).then((b) => {
      if (!cancelled) setBalance(b);
    });
    return () => {
      cancelled = true;
    };
  }, [address, airdropToken]);

  const csvParsed = useMemo(() => {
    if (mode !== "csv" || !csvText.trim()) {
      return { recipients: [] as CsvRecipient[], errors: [] as string[] };
    }
    return parseRecipientsCsv(csvText);
  }, [csvText, mode]);

  const csvRecipients = csvParsed.recipients;

  useEffect(() => {
    setCsvErrors(csvParsed.errors);
  }, [csvParsed.errors]);

  const recipients: RecipientRow[] = useMemo(() => {
    if (mode === "csv") {
      return csvRecipients.map((r) => ({
        address: r.address,
        amount: r.amount,
      }));
    }

    const custom = Math.max(1, Math.floor(Number(customAmount) || 1));
    const rows: RecipientRow[] = [];

    for (const h of holders) {
      if (excludeSelf && address && h.address === address) continue;

      let amount = 1;
      if (amountMode === "match") amount = Math.max(1, Math.floor(h.quantity));
      else if (amountMode === "custom") amount = custom;
      else amount = 1;

      rows.push({
        address: h.address,
        amount,
        alias: h.alias,
        held: h.quantity,
      });
    }
    return rows;
  }, [
    mode,
    csvRecipients,
    holders,
    amountMode,
    customAmount,
    excludeSelf,
    address,
  ]);

  const totalEditions = useMemo(
    () => recipients.reduce((s, r) => s + r.amount, 0),
    [recipients],
  );

  const signingBatches = useMemo(
    () => estimateSigningBatches(recipients.length),
    [recipients.length],
  );

  const canSend =
    !!address &&
    !!airdropToken &&
    recipients.length > 0 &&
    totalEditions > 0 &&
    !busy;

  function tryConfirm() {
    setResult(null);
    if (!address) {
      setResult({ ok: false, message: "Connect your Tezos wallet first." });
      return;
    }
    if (!airdropToken) {
      setResult({
        ok: false,
        message: "Load the airdrop token.",
      });
      return;
    }
    if (recipients.length === 0) {
      setResult({ ok: false, message: "No recipients." });
      return;
    }
    if (balance !== null && balance < totalEditions) {
      setResult({
        ok: false,
        message: `Not enough editions. Hold ${balance}, need ${totalEditions}.`,
      });
      return;
    }
    setConfirmOpen(true);
  }

  async function sendAirdrop() {
    setConfirmOpen(false);
    if (!address || !airdropToken) return;
    setBusy(true);
    setProgress(
      signingBatches > 1
        ? `Preparing ${signingBatches} wallet signatures (max ${MAX_RECIPIENTS_PER_SIGNATURE}/batch)…`
        : "Preparing transfer…",
    );
    setResult(null);
    try {
      const transfers = recipients.map((r) => ({
        fa: airdropToken.faContract,
        tokenId: airdropToken.tokenId,
        to: r.address,
        amount: r.amount,
      }));

      const { hashes, batches } = await sendAllTransfers(address, transfers, {
        onProgress: ({ done, total, opHash, recipientsInBatch }) => {
          setProgress(
            `Batch ${done}/${total} · ${recipientsInBatch} wallets · ${shortAddress(opHash, 8, 6)} — approve next if prompted`,
          );
        },
      });

      setResult({
        ok: true,
        message: `Sent ${totalEditions} edition(s) to ${recipients.length} wallet(s) in ${batches} signature batch(es).`,
        hashes,
      });
      const b = await getFa2Balance(
        airdropToken.faContract,
        airdropToken.tokenId,
        address,
      );
      setBalance(b);
    } catch (err) {
      const partial = err as Error & { sentHashes?: string[] };
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Transaction failed",
        hashes: partial.sentHashes,
      });
      if (airdropToken && address) {
        const b = await getFa2Balance(
          airdropToken.faContract,
          airdropToken.tokenId,
          address,
        );
        setBalance(b);
      }
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function exportCsv() {
    const lines = ["address,amount,alias"];
    for (const r of recipients) {
      const alias = (r.alias ?? "").replace(/,/g, " ");
      lines.push(`${r.address},${r.amount},${alias}`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `xtz-airdrop-recipients-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="airdrop-page">
      <header className="airdrop-header">
        <h1>xtz airdrop tool</h1>
      </header>

      {/* Wallet bar */}
      <section className="airdrop-card airdrop-wallet-bar">
        {address ? (
          <>
            <div>
              <span className="muted">Connected</span>
              <div className="mono">{shortAddress(address, 8, 6)}</div>
            </div>
            <button type="button" className="btn ghost" onClick={() => void disconnect()}>
              Disconnect
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn primary"
              onClick={() => void connect()}
              disabled={walletStatus === "connecting"}
            >
              {walletStatus === "connecting" ? "Connecting…" : "Connect wallet"}
            </button>
          </>
        )}
        {walletError && <p className="error-text">{walletError}</p>}
      </section>

      {/* Mode tabs */}
      <div className="airdrop-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "holders"}
          className={mode === "holders" ? "active" : ""}
          onClick={() => setMode("holders")}
        >
          Holders → airdrop
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "csv"}
          className={mode === "csv" ? "active" : ""}
          onClick={() => setMode("csv")}
        >
          CSV list
        </button>
      </div>

      {mode === "holders" && (
        <section className="airdrop-grid">
          <div className="airdrop-card">
            <h2>1. Who gets it?</h2>
            <label className="field-label">Holders source (objkt URL)</label>
            <input
              className="field"
              type="url"
              name="holders-source-url"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={holdersUrl}
              onChange={(e) => setHoldersUrl(e.target.value)}
              placeholder=""
            />
            <button
              type="button"
              className="btn secondary"
              onClick={() => void loadHolders()}
              disabled={loadingHolders || !holdersUrl.trim()}
            >
              {loadingHolders ? "Loading holders…" : "Load holders"}
            </button>
            {sourceToken && (
              <TokenPreview
                token={sourceToken}
                badge={`${holdersStats?.uniqueHolders ?? holders.length} wallets`}
              />
            )}
            {holdersStats && (
              <p className="muted small">
                {holdersStats.uniqueHolders} wallets · {holdersStats.totalEditions}{" "}
                editions held
                {holdersStats.skipped > 0 &&
                  ` · skipped ${holdersStats.skipped} burn/contract`}
              </p>
            )}
          </div>

          <div className="airdrop-card">
            <h2>2. What are you sending?</h2>
            <label className="field-label">Airdrop token (objkt URL)</label>
            <input
              className="field"
              type="url"
              name="airdrop-token-url"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={airdropUrl}
              onChange={(e) => setAirdropUrl(e.target.value)}
              placeholder=""
            />
            <button
              type="button"
              className="btn secondary"
              onClick={() => void loadAirdropToken()}
              disabled={loadingAirdrop || !airdropUrl.trim()}
            >
              {loadingAirdrop ? "Loading…" : "Load airdrop token"}
            </button>
            {airdropToken && (
              <TokenPreview
                token={airdropToken}
                totalSupply={airdropToken.supply}
                owned={address ? balance : null}
              />
            )}
          </div>
        </section>
      )}

      {mode === "csv" && (
        <section className="airdrop-card">
          <h2>CSV / address list</h2>
          <label className="field-label">Airdrop token (objkt URL)</label>
          <input
            className="field"
            type="url"
            name="airdrop-token-url-csv"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={airdropUrl}
            onChange={(e) => setAirdropUrl(e.target.value)}
            placeholder=""
          />
          <button
            type="button"
            className="btn secondary"
            onClick={() => void loadAirdropToken()}
            disabled={loadingAirdrop || !airdropUrl.trim()}
          >
            {loadingAirdrop ? "Loading…" : "Load airdrop token"}
          </button>
          {airdropToken && (
            <TokenPreview
              token={airdropToken}
              totalSupply={airdropToken.supply}
              owned={address ? balance : null}
            />
          )}
          <label className="field-label">Recipients (address, amount)</label>
          <textarea
            className="field textarea"
            name="airdrop-recipients-csv"
            autoComplete="off"
            spellCheck={false}
            rows={10}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder=""
          />
          {csvErrors.length > 0 && (
            <ul className="error-list">
              {csvErrors.slice(0, 8).map((e) => (
                <li key={e}>{e}</li>
              ))}
              {csvErrors.length > 8 && <li>…and {csvErrors.length - 8} more</li>}
            </ul>
          )}
        </section>
      )}

      {/* Amount rules (holders mode) */}
      {mode === "holders" && (
        <section className="airdrop-card">
          <h2>3. Amount</h2>
          <div className="radio-row">
            <label>
              <input
                type="radio"
                name="amountMode"
                checked={amountMode === "match"}
                onChange={() => setAmountMode("match")}
              />
              Match held quantity
            </label>
            <label>
              <input
                type="radio"
                name="amountMode"
                checked={amountMode === "one"}
                onChange={() => setAmountMode("one")}
              />
              1 per wallet
            </label>
            <label>
              <input
                type="radio"
                name="amountMode"
                checked={amountMode === "custom"}
                onChange={() => setAmountMode("custom")}
              />
              Custom
              {amountMode === "custom" && (
                <input
                  type="number"
                  min={1}
                  className="field inline"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                />
              )}
            </label>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={excludeSelf}
              onChange={(e) => setExcludeSelf(e.target.checked)}
            />
            Exclude my wallet
          </label>
        </section>
      )}

      {fetchError && <p className="error-text banner">{fetchError}</p>}

      {/* Preview */}
      <section className="airdrop-card">
        <div className="preview-head">
          <h2>Recipients preview</h2>
          <div className="preview-actions">
            <span className="muted small">
              {recipients.length} wallets · {totalEditions} editions
              {signingBatches > 0 && (
                <>
                  {" "}
                  · {signingBatches} wallet sign
                  {signingBatches === 1 ? "" : "s"}
                  {recipients.length > MAX_RECIPIENTS_PER_SIGNATURE &&
                    ` (≤${MAX_RECIPIENTS_PER_SIGNATURE}/batch)`}
                </>
              )}
            </span>
            <button
              type="button"
              className="btn ghost small-btn"
              onClick={exportCsv}
              disabled={recipients.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>

        {recipients.length === 0 ? (
          <p className="muted">No recipients yet.</p>
        ) : (
          <div className="recipient-table-wrap">
            <table className="recipient-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Wallet</th>
                  {mode === "holders" && <th>Holds (source)</th>}
                  <th>Airdrop qty</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r, i) => (
                  <tr key={r.address}>
                    <td className="muted">{i + 1}</td>
                    <td>
                      <span className="mono" title={r.address}>
                        {shortAddress(r.address, 8, 6)}
                      </span>
                      {r.alias && <span className="alias"> {r.alias}</span>}
                    </td>
                    {mode === "holders" && (
                      <td className="muted">{r.held ?? "—"}</td>
                    )}
                    <td>{r.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="send-row">
          <button
            type="button"
            className="btn primary large"
            onClick={tryConfirm}
            disabled={!canSend}
          >
            {busy
              ? progress ?? "Sending…"
              : signingBatches > 1
                ? `Airdrop ${totalEditions} → ${recipients.length} wallets (${signingBatches} signs)`
                : `Airdrop ${totalEditions} → ${recipients.length} wallet${recipients.length === 1 ? "" : "s"}`}
          </button>
        </div>

        {progress && !result && <p className="progress-text">{progress}</p>}

        {result && (
          <div className={`result ${result.ok ? "ok" : "fail"}`}>
            <p>{result.message}</p>
            {result.hashes?.map((h) => (
              <a
                key={h}
                href={`https://tzkt.io/${h}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mono hash-link"
              >
                {h}
              </a>
            ))}
          </div>
        )}
      </section>

      {confirmOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Confirm</h3>
            <p>
              Send <strong>{totalEditions}</strong> edition
              {totalEditions === 1 ? "" : "s"} to{" "}
              <strong>{recipients.length}</strong> wallet
              {recipients.length === 1 ? "" : "s"}?
            </p>
            {signingBatches > 1 && (
              <p className="muted small">
                Split into <strong>{signingBatches}</strong> wallet approvals (max{" "}
                {MAX_RECIPIENTS_PER_SIGNATURE} wallets each). Approve each when
                prompted — do not close the tab mid-run.
              </p>
            )}
            {balance !== null && (
              <p className="muted small">
                Balance: {balance} · need: {totalEditions}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => void sendAirdrop()}
                disabled={busy}
              >
                {signingBatches > 1
                  ? `Sign ${signingBatches} batches`
                  : "Sign & send"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="airdrop-disclaimer muted small">
        <p>
          Experimental tool. Use at your own risk. Double-check recipients,
          amounts, and token before signing. Transfers on Tezos are irreversible.
          This page never holds your private keys — you sign only via your wallet
          (Beacon). The author is not liable for failed transactions, wrong
          destinations, lost tokens, gas costs, or any damages from using this
          tool.
        </p>
      </footer>

      <style jsx>{`
        .airdrop-page {
          max-width: 920px;
          margin: 0 auto;
          padding: 2rem 1.25rem 4rem;
          color: var(--color-text, #fff);
          font-family: var(--font-family, monospace);
        }
        .airdrop-disclaimer {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.45);
          font-size: 0.72rem;
        }
        .airdrop-disclaimer p {
          margin: 0;
        }
        .airdrop-header {
          margin-bottom: 1.25rem;
        }
        h1 {
          font-family: var(--font-display, monospace);
          font-size: clamp(1.6rem, 4vw, 2.2rem);
          margin: 0;
          letter-spacing: 0.03em;
        }
        h2 {
          font-size: 1rem;
          margin: 0 0 0.5rem;
          letter-spacing: 0.04em;
        }
        h3 {
          margin: 0 0 0.75rem;
          font-size: 1.1rem;
        }
        .airdrop-card {
          border: 1px solid rgba(120, 90, 180, 0.28);
          background: linear-gradient(
            165deg,
            rgba(8, 5, 14, 0.95),
            rgba(3, 2, 7, 0.98)
          );
          border-radius: 10px;
          padding: 1.15rem 1.2rem;
          margin-bottom: 1rem;
        }
        .airdrop-wallet-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .airdrop-tabs {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1rem;
        }
        .airdrop-tabs button {
          flex: 1;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.7);
          padding: 0.65rem 0.8rem;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.85rem;
        }
        .airdrop-tabs button.active {
          border-color: var(--accent-pink, #ff3d6e);
          color: #fff;
          box-shadow: 0 0 12px rgba(255, 61, 110, 0.25);
        }
        .airdrop-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 720px) {
          .airdrop-grid {
            grid-template-columns: 1fr;
          }
        }
        .field-label {
          display: block;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.5);
          margin: 0.75rem 0 0.35rem;
        }
        .field {
          width: 100%;
          box-sizing: border-box;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #fff;
          border-radius: 6px;
          padding: 0.55rem 0.7rem;
          font-family: inherit;
          font-size: 0.85rem;
          margin-bottom: 0.65rem;
        }
        .field.inline {
          width: 4rem;
          margin: 0 0 0 0.5rem;
          display: inline-block;
        }
        .field.textarea {
          font-family: ui-monospace, monospace;
          font-size: 0.78rem;
          resize: vertical;
        }
        .field:focus {
          outline: none;
          border-color: rgba(0, 184, 176, 0.7);
        }
        .btn {
          border: none;
          border-radius: 7px;
          padding: 0.55rem 1rem;
          font-family: inherit;
          font-size: 0.85rem;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }
        .btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .btn.primary {
          background: var(--accent-pink, #ff3d6e);
          color: #fff;
          font-weight: 600;
        }
        .btn.secondary {
          background: rgba(0, 184, 176, 0.18);
          color: #7ef0ea;
          border: 1px solid rgba(0, 184, 176, 0.4);
        }
        .btn.ghost {
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .btn.large {
          padding: 0.75rem 1.25rem;
          font-size: 0.95rem;
        }
        .btn.small-btn {
          padding: 0.35rem 0.7rem;
          font-size: 0.75rem;
        }
        .muted {
          color: rgba(255, 255, 255, 0.55);
        }
        .small {
          font-size: 0.8rem;
        }
        .mono {
          font-family: ui-monospace, "Courier New", monospace;
          font-size: 0.85em;
        }
        .error-text {
          color: #ff7a9a;
          font-size: 0.85rem;
        }
        .error-text.banner {
          padding: 0.6rem 0.8rem;
          border: 1px solid rgba(255, 61, 110, 0.4);
          border-radius: 8px;
          background: rgba(255, 61, 110, 0.08);
        }
        .error-list {
          color: #ff7a9a;
          font-size: 0.78rem;
          margin: 0.4rem 0 0;
          padding-left: 1.1rem;
        }
        .radio-row {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .radio-row label,
        .check-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.88rem;
          cursor: pointer;
        }
        .check-row {
          margin-top: 0.9rem;
        }
        .preview-head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .preview-head h2 {
          margin: 0;
        }
        .preview-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .recipient-table-wrap {
          max-height: 320px;
          overflow: auto;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }
        .recipient-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
        }
        .recipient-table th,
        .recipient-table td {
          text-align: left;
          padding: 0.4rem 0.65rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .recipient-table th {
          position: sticky;
          top: 0;
          background: #0a0810;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 0.68rem;
        }
        .alias {
          color: rgba(0, 184, 176, 0.85);
          font-size: 0.78em;
        }
        .send-row {
          margin-top: 1.1rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.45rem;
        }
        .progress-text {
          margin-top: 0.75rem;
          color: #7ef0ea;
          font-size: 0.85rem;
        }
        .result {
          margin-top: 1rem;
          padding: 0.75rem 0.9rem;
          border-radius: 8px;
          font-size: 0.88rem;
        }
        .result.ok {
          background: rgba(0, 180, 100, 0.12);
          border: 1px solid rgba(0, 200, 120, 0.35);
        }
        .result.fail {
          background: rgba(255, 61, 110, 0.1);
          border: 1px solid rgba(255, 61, 110, 0.4);
        }
        .hash-link {
          display: block;
          margin-top: 0.35rem;
          color: #7ef0ea;
          word-break: break-all;
          font-size: 0.75rem;
        }
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal {
          background: #0c0a12;
          border: 1px solid rgba(255, 61, 110, 0.45);
          border-radius: 12px;
          padding: 1.4rem 1.5rem;
          max-width: 420px;
          width: 100%;
          box-shadow: 0 0 40px rgba(255, 61, 110, 0.15);
        }
        .warn {
          color: #ffb3c5;
          font-size: 0.85rem;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.6rem;
          margin-top: 1.1rem;
        }
        :global(.token-preview) {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin-top: 0.85rem;
          padding: 0.55rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        :global(.token-preview img) {
          width: 52px;
          height: 52px;
          object-fit: cover;
          border-radius: 6px;
          background: #111;
        }
        :global(.token-preview .meta) {
          min-width: 0;
        }
        :global(.token-preview .name) {
          font-size: 0.88rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :global(.token-preview .sub) {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.5);
          font-family: ui-monospace, monospace;
        }
        :global(.token-preview .stats) {
          margin-top: 0.3rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          align-items: baseline;
        }
        :global(.token-preview .stats strong) {
          color: #fff;
          font-weight: 600;
        }
        :global(.token-preview .stats .dot) {
          color: rgba(255, 255, 255, 0.35);
        }
        :global(.token-preview .badge) {
          display: inline-block;
          margin-top: 0.25rem;
          font-size: 0.68rem;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
          background: rgba(255, 61, 110, 0.15);
          color: #ff9bb4;
        }
      `}</style>
    </div>
  );
}

function TokenPreview({
  token,
  badge,
  totalSupply,
  owned,
}: {
  token: TokenCard;
  badge?: string;
  /** Collection total supply (all editions minted) */
  totalSupply?: number;
  /** How many editions the connected wallet holds (null = unknown / not connected) */
  owned?: number | null;
}) {
  return (
    <div className="token-preview">
      {token.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={token.image} alt="" />
      ) : (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 6,
            background: "#1a1520",
          }}
        />
      )}
      <div className="meta">
        <div className="name">{token.name || "Untitled"}</div>
        <div className="sub">
          {shortAddress(token.faContract, 6, 4)}:{token.tokenId}
        </div>
        {totalSupply !== undefined && (
          <div className="stats">
            <span>
              total supply <strong>{totalSupply}</strong>
            </span>
            <span className="dot">·</span>
            <span>
              owned{" "}
              <strong>
                {owned === undefined || owned === null ? "—" : owned}
              </strong>
            </span>
          </div>
        )}
        {badge && <span className="badge">{badge}</span>}
      </div>
    </div>
  );
}
