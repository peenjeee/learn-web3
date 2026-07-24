import { useState } from 'react'
import { ethers } from 'ethers'
import { Wallet, Droplets, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Ganti dengan alamat Faucet yang sudah dideploy
const FAUCET_ADDRESS = import.meta.env.VITE_FAUCET_ADDRESS;

const FAUCET_ABI = [
  "function requestTokens() external"
]

export default function App() {
  const [account, setAccount] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ type: "", message: "" })

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        setAccount(accounts[0])
      } catch (err) {
        setStatus({ type: "error", message: "Gagal menghubungkan wallet." })
      }
    } else {
      setStatus({ type: "error", message: "MetaMask tidak terdeteksi!" })
    }
  }

  const disconnectWallet = () => {
    setAccount("")
    setStatus({ type: "", message: "" })
  }

  const claimTokens = async () => {
    if (!account) return
    setLoading(true)
    setStatus({ type: "", message: "" })
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const faucetContract = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, signer)
      
      const tx = await faucetContract.requestTokens()
      await tx.wait()
      
      setStatus({ type: "success", message: "100 RWD berhasil diklaim!" })
    } catch (err) {
      console.error(err)
      let msg = "Gagal klaim token. Pastikan Anda belum pernah klaim dalam 24 jam terakhir."
      
      if (err.code === "ACTION_REJECTED" || (err.message && err.message.toLowerCase().includes("reject"))) {
        msg = "Transaksi dibatalkan."
      } else if (err.message && err.message.includes("MasihCooldown")) {
        msg = "Anda masih dalam masa cooldown 24 jam."
      }
      
      setStatus({ type: "error", message: msg })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans text-foreground">
      <div className="w-full max-w-md border bg-card text-card-foreground rounded-xl shadow-sm p-6 space-y-6">
        
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="p-3 bg-primary/10 rounded-full">
            <Droplets className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reward Faucet</h1>
          <p className="text-sm text-gray-500">
            Klaim 100 RWD Token secara gratis untuk pengujian platform Bounty Escrow.
            <br />
            <span className="text-xs text-red-400 font-medium mt-1 inline-block">*Catatan: Maksimal klaim 1 kali per 24 jam untuk setiap alamat dompet</span>
          </p>
        </div>

        <div className="space-y-4">
          {!account ? (
            <button 
              onClick={connectWallet}
              className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </button>
          ) : (
            <div className="space-y-4">
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50/50 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Wallet Terhubung</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-md border border-gray-200 font-mono shadow-sm">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                  <button
                    onClick={disconnectWallet}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 font-medium px-2 py-1 rounded-md transition-colors"
                  >
                    Putuskan
                  </button>
                </div>
              </div>
              
              <button 
                onClick={claimTokens}
                disabled={loading}
                className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Claim 100 RWD"
                )}
              </button>
            </div>
          )}

          {status.message && (
            <div className={cn(
              "p-4 rounded-md text-sm flex items-start space-x-3",
              status.type === "success" 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            )}>
              {status.type === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{status.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
