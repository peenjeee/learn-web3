import os
import time

from dotenv import load_dotenv

from chain import Chain
from judge import judge


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} belum diisi di .env")
    return value


def main() -> None:
    load_dotenv()
    chain = Chain(required("BSC_TESTNET_RPC"), required("BOUNTY_FACTORY"))
    interval = int(os.getenv("POLL_INTERVAL_SECONDS", "15"))

    print(f"Agent wallet   : {chain.wallet.address}")
    print(f"Oracle on-chain: {chain.oracle()}")
    if chain.wallet.address.lower() != chain.oracle().lower():
        raise RuntimeError("alamat berbeda; jalankan setOracle ke wallet agent")
    required("LLM_API_KEY")
    required("LLM_BASE_URL")
    required("LLM_MODEL")
    print(f"Mulai polling tiap {interval} detik. Ctrl+C buat berhenti.")

    while True:
        for bounty_id, escrow, worker, rules_uri, proof_uri in chain.pending_bounties():
            try:
                eligible, reason = judge(rules_uri, proof_uri)
                tx_hash = chain.send_verdict(escrow, eligible)
                print(
                    f"\n[bounty #{bounty_id}] {escrow}\n"
                    f"  worker: {worker}\n"
                    f"  proof : {proof_uri}\n"
                    f"  verdict AI: {'ELIGIBLE' if eligible else 'DITOLAK'} ({reason})\n"
                    f"  tx: {tx_hash} (sukses)"
                )
            except Exception as error:
                print(f"[bounty #{bounty_id}] gagal diproses: {error}")
        time.sleep(interval)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nAgent berhenti.")

