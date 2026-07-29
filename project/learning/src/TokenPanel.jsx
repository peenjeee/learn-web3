/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import {
  CheckCircle2,
  Coins,
  ExternalLink,
  Flame,
  Loader2,
  Plus,
} from 'lucide-react'

const RPC_URL =
  import.meta.env.VITE_BSC_TESTNET_RPC ||
  'https://bsc-testnet-rpc.publicnode.com'
const EXPLORER = 'https://testnet.bscscan.com'
const BSC_TESTNET_CHAIN_ID = 97n

const TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function owner() view returns (address)',
  'function mint(address,uint256)',
  'function burn(uint256)',
  'function isMinter(address) view returns (bool)',
  'function MAX_SUPPLY() view returns (uint256)',
]

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-'
}

export default function TokenPanel({
  address,
  account,
  task,
  rewardToken = false,
  onNotice,
}) {
  const [token, setToken] = useState(null)
  const [recipient, setRecipient] = useState(account)
  const [mintAmount, setMintAmount] = useState('100')
  const [burnAmount, setBurnAmount] = useState('10')
  const [busy, setBusy] = useState('')

  const configured = ethers.isAddress(address || '')

  const loadToken = useCallback(async () => {
    if (!configured) return
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const contract = new ethers.Contract(address, TOKEN_ABI, provider)
      const [name, symbol, decimals, totalSupply, owner, balance, minter] =
        await Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
          contract.totalSupply(),
          contract.owner(),
          account ? contract.balanceOf(account) : 0n,
          rewardToken && account ? contract.isMinter(account) : false,
        ])
      setToken({
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        balance: ethers.formatUnits(balance, decimals),
        owner,
        canMint:
          Boolean(account) &&
          (owner.toLowerCase() === account.toLowerCase() || minter),
      })
    } catch (error) {
      onNotice({
        type: 'error',
        message: error.shortMessage || error.message || 'Gagal membaca token.',
      })
    }
  }, [account, address, configured, onNotice, rewardToken])

  useEffect(() => {
    setRecipient(account)
    loadToken()
  }, [account, loadToken])

  const sendTokenTransaction = async (action) => {
    const amount = action === 'mint' ? mintAmount : burnAmount
    if (!amount || Number(amount) <= 0) {
      onNotice({ type: 'error', message: 'Jumlah token harus lebih dari 0.' })
      return
    }
    if (action === 'mint' && !ethers.isAddress(recipient || '')) {
      onNotice({ type: 'error', message: 'Alamat penerima tidak valid.' })
      return
    }

    setBusy(action)
    try {
      if (!window.ethereum) throw new Error('MetaMask tidak terdeteksi.')
      const provider = new ethers.BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()
      if (network.chainId !== BSC_TESTNET_CHAIN_ID) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x61' }],
        })
      }
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(address, TOKEN_ABI, signer)
      const value = ethers.parseUnits(amount, token.decimals)
      const tx =
        action === 'mint'
          ? await contract.mint(recipient, value)
          : await contract.burn(value)
      await tx.wait()
      onNotice({
        type: 'success',
        message:
          action === 'mint'
            ? `${amount} ${token.symbol} berhasil dicetak.`
            : `${amount} ${token.symbol} berhasil dibakar.`,
      })
      await loadToken()
    } catch (error) {
      onNotice({
        type: 'error',
        message:
          error.code === 'ACTION_REJECTED'
            ? 'Transaksi dibatalkan.'
            : error.shortMessage || error.reason || error.message,
      })
    } finally {
      setBusy('')
    }
  }

  if (!configured) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="text-xl font-semibold">Belum terhubung</h2>
        <p className="mt-2 text-sm leading-6">
          Deploy kontrak terlebih dahulu, lalu isi{' '}
          <code className="rounded bg-amber-100 px-1.5 py-0.5">
            VITE_TASK{task}_TOKEN
          </code>{' '}
          di file <code>.env</code>.
        </p>
      </section>
    )
  }

  if (!token) {
    return (
      <div className="ui-card flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">
            {token.name}{' '}
            <span className="text-muted-foreground">({token.symbol})</span>
          </h2>
        </div>
        <a
          href={`${EXPLORER}/token/${address}`}
          target="_blank"
          rel="noreferrer"
          className="ui-button-outline h-9 gap-1 px-3"
        >
          Lihat kontrak
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="ui-card p-5">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Total supply
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {token.totalSupply} {token.symbol}
          </p>
        </div>
        <div className="ui-card p-5">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Saldo wallet
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {account ? token.balance : '-'} {token.symbol}
          </p>
        </div>
        <div className="ui-card p-5">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Owner
          </p>
          <p className="mt-2 font-mono text-sm font-medium">
            {shortAddress(token.owner)}
          </p>
          {token.canMint && (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Wallet boleh mint
            </p>
          )}
        </div>
      </div>

      <div className={`grid gap-4 ${rewardToken ? 'lg:grid-cols-2' : ''}`}>
        <div className="ui-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-md border bg-muted p-2">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Mint token</h3>
              <p className="text-xs text-muted-foreground">
                Hanya owner{rewardToken ? ' atau minter' : ''}.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <input
              value={recipient || ''}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="Alamat penerima 0x..."
              className="ui-input"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={mintAmount}
                onChange={(event) => setMintAmount(event.target.value)}
                className="ui-input min-w-0 flex-1"
              />
              <button
                onClick={() => sendTokenTransaction('mint')}
                disabled={!token.canMint || busy === 'mint'}
                className="ui-button min-w-24"
              >
                {busy === 'mint' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Coins className="h-4 w-4" />
                )}
                Mint
              </button>
            </div>
          </div>
        </div>

        {rewardToken && (
          <div className="ui-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-md border bg-muted p-2 text-destructive">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Burn token</h3>
                <p className="text-xs text-muted-foreground">
                  Setiap holder dapat membakar token sendiri.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                type="number"
                min="0"
                value={burnAmount}
                onChange={(event) => setBurnAmount(event.target.value)}
                className="ui-input min-w-0 flex-1"
              />
              <button
                onClick={() => sendTokenTransaction('burn')}
                disabled={!account || busy === 'burn'}
                className="inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {busy === 'burn' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flame className="h-4 w-4" />
                )}
                Burn
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
