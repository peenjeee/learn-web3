# BNB Agent Studio — Bounty Submission Oracle

AI agent ini memeriksa submission bounty dan mengirim hasil penilaiannya ke
smart contract di BNB Testnet.

Alurnya:

1. Worker memanggil `submitWork(proofURI)` pada `BountyEscrow`.
2. Agent mencari escrow berstatus `Disubmit`.
3. Agent membaca `rulesURI` dan `proofURI`.
4. LLM mengembalikan verdict `eligible` atau `ditolak`.
5. Wallet BNB Agent Studio memanggil `fulfillVerification(eligible)`.
6. Submission yang lolos menerima hadiah. Submission yang ditolak kembali
   berstatus `Dibuka`.

## Komponen

- `main.py` — polling bounty setiap 15 detik.
- `judge.py` — mengambil aturan dan bukti, lalu meminta verdict dari LLM.
- `chain.py` — membaca kontrak dan mengirim transaksi dari wallet agent.
- `abi.py` — ABI minimal `BountyFactory` dan `BountyEscrow`.
- `studio.toml` — konfigurasi encrypted keystore BNB Agent Studio.

## Setup

Memerlukan Python 3.10 atau lebih baru.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

Buat wallet agent:

```bash
printf "Wallet password: "
read -s WALLET_PASSWORD
printf "\n"
export WALLET_PASSWORD
bag wallet new
```

Kirim sedikit tBNB ke alamat wallet yang muncul agar agent dapat membayar gas.

Isi `.env`:

```env
BSC_TESTNET_RPC=https://bsc-testnet-rpc.publicnode.com
BOUNTY_FACTORY=0x...
WALLET_PASSWORD=...
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=...
LLM_MODEL=openrouter/free
POLL_INTERVAL_SECONDS=15
```

Jangan commit `.env`, `.studio/`, atau private key. Ketiganya sudah dilindungi
oleh `.gitignore`.

## Daftarkan Oracle

Owner factory perlu mendaftarkan alamat wallet agent satu kali:

```bash
cast send "$BOUNTY_FACTORY" "setOracle(address)" <ALAMAT_AGENT> \
  --rpc-url "$BSC_TESTNET_RPC" \
  --private-key "$PRIVATE_KEY" \
  --legacy
```

## Jalankan

```bash
source .venv/bin/activate
python main.py
```

Alamat pada dua baris pertama harus sama:

```text
Agent wallet   : 0x...
Oracle on-chain: 0x...
Mulai polling tiap 15 detik. Ctrl+C buat berhenti.
```

## Pengujian

```bash
python -m unittest -v
```

Demo end-to-end telah dijalankan di BNB Testnet:

- Factory: `0xE8B322a0E756648C54CFB5eE95caea6896a77253`
- Agent: `0xcd27B12a3552a6f2D2a3829425fA60a1535c5bA7`
- Escrow demo: `0x4A39A4eFF804A68915E488CfC6B00C4FFCFA53e8`
- Verdict agent:
  `0xd244b9d137a1490239403b602675c8fad648c2777698b6be3bdb51c090e08792`

Hasil akhirnya adalah status `Selesai`, saldo escrow `0 RWD`, dan hadiah
berpindah ke worker.

## Batas Keamanan

Kontrak mempercayai alamat oracle, bukan model AI. Implementasi workshop ini
masih memakai satu oracle dan belum memiliki multi-oracle, dispute window,
atau perlindungan prompt injection tingkat produksi.
