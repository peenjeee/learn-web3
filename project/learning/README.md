# Web3 Learning Dashboard

Dashboard latihan Web3 untuk berinteraksi langsung dengan smart contract di
BNB Smart Chain Testnet.

## Fitur

- **Tugas 1 — MTK:** melihat informasi token dan saldo wallet, serta mint oleh owner.
- **Tugas 2 — RWD:** mengelola Reward Token yang digunakan oleh faucet dan bounty.
- **Tugas 3 — Faucet:** klaim 100 RWD dengan cooldown 24 jam untuk setiap wallet.
- **Tugas 4 — AI Bounty:** membuat bounty, mengunci hadiah RWD, mengirim bukti
  pekerjaan, dan memantau hasil verifikasi AI oracle.

## Menjalankan aplikasi

Prasyarat:

- Node.js 18 atau lebih baru
- MetaMask
- Sedikit tBNB untuk biaya transaksi

```bash
cd project/learning
npm install
cp .env_example .env
npm run dev
```

Buka alamat yang ditampilkan Vite, lalu hubungkan MetaMask ke **BNB Smart
Chain Testnet** (chain ID `97`).

## Konfigurasi

Isi file `.env`:

```env
VITE_TASK1_TOKEN="ALAMAT_TOKEN_MTK"
VITE_TASK2_TOKEN="ALAMAT_TOKEN_RWD"
VITE_FAUCET_ADDRESS="ALAMAT_FAUCET"
VITE_BOUNTY_FACTORY="ALAMAT_BOUNTY_FACTORY"
VITE_BSC_TESTNET_RPC="https://bsc-testnet-rpc.publicnode.com"
```

Semua alamat harus berasal dari deployment di BNB Testnet. Jangan pernah
menaruh private key, password wallet, atau API key di aplikasi frontend.

## Membuat AI bounty

1. Pastikan wallet memiliki RWD dan tBNB.
2. Buka tab **AI Bounty**.
3. Isi jumlah hadiah, deadline, dan URL aturan publik dari GitHub atau IPFS.
4. Konfirmasi transaksi `approve` jika diminta, kemudian konfirmasi pembuatan
   bounty.
5. Worker dapat mengirim URL bukti pada kartu bounty yang berstatus **Dibuka**.

AI oracle dijalankan terpisah dari folder `4/pertemuan-4/agent-oracle`.

## Pemeriksaan

```bash
npm run lint
npm run build
```

Teknologi utama: React, Vite, Tailwind CSS, ethers, dan lucide-react.
