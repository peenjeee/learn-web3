/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Droplets,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trophy,
  Wallet,
  X,
} from 'lucide-react'
import TokenPanel from './TokenPanel'

const FAUCET_ADDRESS = import.meta.env.VITE_FAUCET_ADDRESS
const FACTORY_ADDRESS = import.meta.env.VITE_BOUNTY_FACTORY
const TASK1_TOKEN_ADDRESS = import.meta.env.VITE_TASK1_TOKEN
const TASK2_TOKEN_ADDRESS = import.meta.env.VITE_TASK2_TOKEN
const RPC_URL =
  import.meta.env.VITE_BSC_TESTNET_RPC ||
  'https://bsc-testnet-rpc.publicnode.com'
const EXPLORER = 'https://testnet.bscscan.com'
const BSC_TESTNET_CHAIN_ID = 97n

const FAUCET_ABI = [
  'function requestTokens() external',
  'error MasihCooldown(uint256 waktuTersisa)',
]
const FAUCET_INTERFACE = new ethers.Interface(FAUCET_ABI)
const FACTORY_ABI = [
  'function oracle() view returns (address)',
  'function rewardToken() view returns (address)',
  'function totalBounties() view returns (uint256)',
  'function bounties(uint256) view returns (address)',
  'function createBounty(uint256 rewardAmount, string rulesURI, uint256 submissionDeadline) returns (address)',
]
const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]
const ESCROW_ABI = [
  'function creator() view returns (address)',
  'function rewardAmount() view returns (uint256)',
  'function submissionDeadline() view returns (uint256)',
  'function rulesURI() view returns (string)',
  'function status() view returns (uint8)',
  'function worker() view returns (address)',
  'function proofURI() view returns (string)',
  'function submitWork(string proofURI)',
]

const STATUS = [
  { label: 'Menunggu dana', tone: 'slate' },
  { label: 'Dibuka', tone: 'emerald' },
  { label: 'Menunggu AI', tone: 'amber' },
  { label: 'Selesai', tone: 'blue' },
  { label: 'Dibatalkan', tone: 'red' },
]

const TABS = [
  { id: 'task1', label: 'MTK' },
  { id: 'task2', label: 'RWD' },
  { id: 'faucet', label: 'Faucet' },
  { id: 'bounties', label: 'AI Bounty' },
]

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-'
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function formatCooldown(seconds) {
  const totalMinutes = Math.max(1, Math.ceil(Number(seconds) / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return [hours && `${hours} jam`, minutes && `${minutes} menit`]
    .filter(Boolean)
    .join(' ')
}

function errorMessage(error) {
  if (error?.code === 'ACTION_REJECTED') return 'Transaksi dibatalkan.'
  const revertData = [
    error?.data,
    error?.info?.error?.data?.data,
    error?.info?.error?.data,
    error?.error?.data,
  ].find((value) => typeof value === 'string' && value.startsWith('0x'))

  if (revertData) {
    try {
      const decoded = FAUCET_INTERFACE.parseError(revertData)
      if (decoded?.name === 'MasihCooldown') {
        return `Wallet ini masih cooldown. Coba lagi dalam ${formatCooldown(decoded.args.waktuTersisa)}.`
      }
    } catch {
      // Bukan custom error milik Faucet.
    }
  }

  const message = error?.shortMessage || error?.reason || error?.message || ''
  if (message.includes('MasihCooldown')) {
    return 'Wallet ini masih dalam masa cooldown 24 jam.'
  }
  if (message.includes('DeadlineLewat')) return 'Deadline bounty sudah lewat.'
  if (message.includes('StatusSalah')) return 'Status bounty sudah berubah.'
  return message ? message.slice(0, 180) : 'Transaksi gagal.'
}

function Notice({ notice, onClose }) {
  if (!notice.message) return null
  const success = notice.type === 'success'

  return (
    <div
      role={success ? 'status' : 'alert'}
      aria-live={success ? 'polite' : 'assertive'}
      className={`fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-lg border bg-background p-4 text-sm shadow-lg ${
        success
          ? 'border-emerald-200 text-emerald-900'
          : 'border-destructive/30 text-destructive'
      }`}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span className="flex-1">{notice.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="-m-1 rounded-sm p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function StatusBadge({ status }) {
  const item = STATUS[status] || STATUS[0]
  const colors = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
  }

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colors[item.tone]}`}
    >
      {item.label}
    </span>
  )
}

export default function App() {
  const [tab, setTab] = useState('bounties')
  const [account, setAccount] = useState('')
  const [notice, setNotice] = useState({ type: '', message: '' })
  const [busy, setBusy] = useState('')
  const [bounties, setBounties] = useState([])
  const [oracle, setOracle] = useState('')
  const [proofs, setProofs] = useState({})
  const [newBounty, setNewBounty] = useState({
    reward: '10',
    rulesURI: '',
    deadline: '',
  })
  const [loadingBounties, setLoadingBounties] = useState(true)

  const loadBounties = useCallback(async () => {
    if (!FACTORY_ADDRESS) {
      setLoadingBounties(false)
      return
    }

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const factory = new ethers.Contract(
        FACTORY_ADDRESS,
        FACTORY_ABI,
        provider,
      )
      const [total, oracleAddress] = await Promise.all([
        factory.totalBounties(),
        factory.oracle(),
      ])
      const addresses = await Promise.all(
        Array.from({ length: Number(total) }, (_, id) => factory.bounties(id)),
      )
      const rows = await Promise.all(
        addresses.map(async (address, id) => {
          const escrow = new ethers.Contract(address, ESCROW_ABI, provider)
          const [
            creator,
            rewardAmount,
            deadline,
            rulesURI,
            status,
            worker,
            proofURI,
          ] = await Promise.all([
            escrow.creator(),
            escrow.rewardAmount(),
            escrow.submissionDeadline(),
            escrow.rulesURI(),
            escrow.status(),
            escrow.worker(),
            escrow.proofURI(),
          ])
          return {
            id,
            address,
            creator,
            reward: ethers.formatUnits(rewardAmount, 18),
            deadline: Number(deadline),
            rulesURI,
            status: Number(status),
            worker,
            proofURI,
          }
        }),
      )
      setOracle(oracleAddress)
      setBounties(rows.reverse())
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) })
    } finally {
      setLoadingBounties(false)
    }
  }, [])

  useEffect(() => {
    loadBounties()
    const interval = window.setInterval(loadBounties, 15_000)
    return () => window.clearInterval(interval)
  }, [loadBounties])

  useEffect(() => {
    if (!window.ethereum) return undefined
    const handleAccounts = (accounts) => setAccount(accounts[0] || '')
    const handleChain = () => window.location.reload()
    window.ethereum.on('accountsChanged', handleAccounts)
    window.ethereum.on('chainChanged', handleChain)
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccounts)
      window.ethereum.removeListener('chainChanged', handleChain)
    }
  }, [])

  useEffect(() => {
    if (!notice.message) return undefined
    const timeout = window.setTimeout(
      () => setNotice({ type: '', message: '' }),
      5000,
    )
    return () => window.clearTimeout(timeout)
  }, [notice.message, notice.type])

  const getSigner = async () => {
    if (!window.ethereum) throw new Error('MetaMask tidak terdeteksi.')
    const provider = new ethers.BrowserProvider(window.ethereum)
    const network = await provider.getNetwork()
    if (network.chainId !== BSC_TESTNET_CHAIN_ID) {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x61' }],
      })
    }
    return provider.getSigner()
  }

  const connectWallet = async () => {
    try {
      const signer = await getSigner()
      setAccount(await signer.getAddress())
      setNotice({ type: '', message: '' })
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) })
    }
  }

  const disconnectWallet = () => {
    setAccount('')
    setNotice({ type: '', message: '' })
  }

  const claimTokens = async () => {
    setBusy('faucet')
    setNotice({ type: '', message: '' })
    try {
      const signer = await getSigner()
      const faucet = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, signer)
      const tx = await faucet.requestTokens()
      await tx.wait()
      setNotice({ type: 'success', message: '100 RWD berhasil diklaim.' })
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) })
    } finally {
      setBusy('')
    }
  }

  const submitProof = async (bounty) => {
    const proof = proofs[bounty.address]?.trim()
    if (!safeHttpUrl(proof)) {
      setNotice({
        type: 'error',
        message: 'Proof harus berupa URL http(s) yang dapat dibuka publik.',
      })
      return
    }

    setBusy(bounty.address)
    setNotice({ type: '', message: '' })
    try {
      const signer = await getSigner()
      const escrow = new ethers.Contract(bounty.address, ESCROW_ABI, signer)
      const tx = await escrow.submitWork(proof)
      await tx.wait()
      setProofs((current) => ({ ...current, [bounty.address]: '' }))

      const response = await fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrow: bounty.address }),
      })
      const verdict = await response.json()
      if (!response.ok) {
        throw new Error(
          `Submission tersimpan, tetapi oracle online gagal: ${verdict.error || response.statusText}`,
        )
      }
      setNotice({
        type: 'success',
        message: verdict.eligible
          ? `Bounty #${bounty.id} lolos AI: ${verdict.reason || 'bukti sesuai aturan'}.`
          : `Bounty #${bounty.id} belum lolos AI: ${verdict.reason || 'bukti belum sesuai aturan'}.`,
      })
      await loadBounties()
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) })
    } finally {
      setBusy('')
    }
  }

  const createBounty = async (event) => {
    event.preventDefault()
    if (!account) {
      await connectWallet()
      return
    }

    const rulesURI = safeHttpUrl(newBounty.rulesURI.trim())
    const deadline = Math.floor(new Date(newBounty.deadline).getTime() / 1000)
    if (!rulesURI) {
      setNotice({
        type: 'error',
        message: 'URL aturan harus berupa URL http(s) yang dapat dibuka publik.',
      })
      return
    }
    if (!Number.isFinite(deadline) || deadline <= Date.now() / 1000) {
      setNotice({
        type: 'error',
        message: 'Deadline harus berada di masa depan.',
      })
      return
    }

    setBusy('create-bounty')
    setNotice({ type: '', message: '' })
    try {
      const signer = await getSigner()
      const creator = await signer.getAddress()
      const factory = new ethers.Contract(
        FACTORY_ADDRESS,
        FACTORY_ABI,
        signer,
      )
      const token = new ethers.Contract(
        await factory.rewardToken(),
        ERC20_ABI,
        signer,
      )
      const rewardAmount = ethers.parseUnits(
        newBounty.reward,
        Number(await token.decimals()),
      )
      if (rewardAmount <= 0n) throw new Error('Hadiah harus lebih dari 0 RWD.')
      if ((await token.balanceOf(creator)) < rewardAmount) {
        throw new Error('Saldo RWD tidak cukup untuk hadiah bounty ini.')
      }

      if ((await token.allowance(creator, FACTORY_ADDRESS)) < rewardAmount) {
        const approval = await token.approve(FACTORY_ADDRESS, rewardAmount)
        await approval.wait()
      }
      const transaction = await factory.createBounty(
        rewardAmount,
        rulesURI,
        deadline,
      )
      await transaction.wait()
      setNewBounty({ reward: '10', rulesURI: '', deadline: '' })
      setNotice({
        type: 'success',
        message: 'Bounty berhasil dibuat dan hadiah RWD sudah dikunci.',
      })
      await loadBounties()
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) })
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Notice
        notice={notice}
        onClose={() => setNotice({ type: '', message: '' })}
      />
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold">PnJ Web3 Project Learning</p>
              <p className="text-xs text-muted-foreground">
                Bootcamp BNB Hackaton x Web3 Dev Jogja
              </p>
            </div>
          </div>

          {account ? (
            <div className="flex items-center gap-2">
              <span className="hidden rounded-md border bg-muted px-3 py-2 font-mono text-xs sm:block">
                {shortAddress(account)}
              </span>
              <button
                onClick={disconnectWallet}
                className="ui-button-outline h-9 px-3 text-xs"
              >
                Putuskan
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="ui-button"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main className="min-h-[calc(100vh-73px)] bg-muted/30">
        <section className="border-b bg-background">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-bold tracking-tight">
                KUMPULAN LATIHAN MATERI WEB3
              </h1>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-muted-foreground sm:flex sm:h-10 sm:w-fit">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`shrink-0 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === item.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:text-foreground'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
          {tab === 'task1' ? (
            <TokenPanel
              address={TASK1_TOKEN_ADDRESS}
              account={account}
              task="1"
              onNotice={setNotice}
            />
          ) : tab === 'task2' ? (
            <TokenPanel
              address={TASK2_TOKEN_ADDRESS}
              account={account}
              task="2"
              rewardToken
              onNotice={setNotice}
            />
          ) : tab === 'faucet' ? (
            <section className="ui-card mx-auto max-w-md p-6">
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <Droplets className="h-8 w-8" />
                </div>
                <div className="mt-3">
                  <h2 className="text-2xl font-bold tracking-tight">
                    Reward Faucet
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Klaim 100 RWD untuk mencoba platform bounty. Setiap wallet
                    hanya dapat claim satu kali per 24 jam.
                  </p>
                </div>
              </div>

              <button
                onClick={account ? claimTokens : connectWallet}
                disabled={busy === 'faucet'}
                className="ui-button mt-6 w-full"
              >
                {busy === 'faucet' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                {account ? 'Claim 100 RWD' : 'Connect Wallet'}
              </button>
            </section>
          ) : (
            <>
              <section className="ui-card p-5">
                <div>
                  <h2 className="text-xl font-semibold">Buat bounty baru</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Hadiah RWD akan dikunci di escrow sampai submission lolos
                    verifikasi AI.
                  </p>
                </div>

                <form
                  onSubmit={createBounty}
                  className="mt-5 grid gap-4 sm:grid-cols-2"
                >
                  <label className="grid gap-2 text-sm font-medium">
                    Hadiah (RWD)
                    <input
                      type="number"
                      min="0.000000000000000001"
                      step="any"
                      required
                      value={newBounty.reward}
                      onChange={(event) =>
                        setNewBounty((current) => ({
                          ...current,
                          reward: event.target.value,
                        }))
                      }
                      className="ui-input"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Deadline submission
                    <input
                      type="datetime-local"
                      required
                      value={newBounty.deadline}
                      onChange={(event) =>
                        setNewBounty((current) => ({
                          ...current,
                          deadline: event.target.value,
                        }))
                      }
                      className="ui-input"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                    URL aturan / brief
                    <input
                      type="url"
                      required
                      value={newBounty.rulesURI}
                      onChange={(event) =>
                        setNewBounty((current) => ({
                          ...current,
                          rulesURI: event.target.value,
                        }))
                      }
                      placeholder="https://github.com/.../RULES.md"
                      className="ui-input"
                    />
                    <span className="font-normal text-muted-foreground">
                      Upload aturan ke GitHub atau IPFS, lalu tempel URL
                      publiknya di sini.
                    </span>
                  </label>
                  <div className="flex justify-end sm:col-span-2">
                    <button
                      type="submit"
                      disabled={busy === 'create-bounty'}
                      className="ui-button sm:min-w-40"
                    >
                      {busy === 'create-bounty' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : account ? (
                        <Plus className="h-4 w-4" />
                      ) : (
                        <Wallet className="h-4 w-4" />
                      )}
                      {account ? 'Buat bounty' : 'Connect Wallet'}
                    </button>
                  </div>
                </form>
              </section>

              <section className="grid gap-4 sm:grid-cols-3">
                <div className="ui-card p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total bounty
                  </p>
                  <p className="mt-2 text-3xl font-bold">{bounties.length}</p>
                </div>
                <div className="ui-card p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Menunggu AI
                  </p>
                  <p className="mt-2 text-3xl font-bold">
                    {bounties.filter((item) => item.status === 2).length}
                  </p>
                </div>
                <div className="ui-card p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Oracle agent
                  </p>
                  <a
                    href={`${EXPLORER}/address/${oracle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 font-mono text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {shortAddress(oracle)}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </section>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Bounty terbaru</h2>
                  <p className="text-sm text-muted-foreground">
                    Data diperbarui otomatis setiap 15 detik.
                  </p>
                </div>
                <button
                  onClick={loadBounties}
                  disabled={loadingBounties}
                  aria-label="Refresh bounty"
                  className="ui-button-outline h-9 w-9 p-0"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loadingBounties ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              {loadingBounties ? (
                <div className="ui-card flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !FACTORY_ADDRESS ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                  Isi <code>VITE_BOUNTY_FACTORY</code> di file <code>.env</code>.
                </div>
              ) : bounties.length === 0 ? (
                <div className="ui-card p-10 text-center text-sm text-muted-foreground">
                  Belum ada bounty di factory.
                </div>
              ) : (
                <section className="grid gap-4 lg:grid-cols-2">
                  {bounties.map((bounty) => {
                    const rulesUrl = safeHttpUrl(bounty.rulesURI)
                    const proofUrl = safeHttpUrl(bounty.proofURI)
                    const deadline = new Date(
                      bounty.deadline * 1000,
                    ).toLocaleString('id-ID')

                    return (
                      <article
                        key={bounty.address}
                        className="ui-card p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Bounty #{bounty.id}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-amber-500" />
                              <h3 className="text-xl font-semibold">
                                {bounty.reward} RWD
                              </h3>
                            </div>
                          </div>
                          <StatusBadge status={bounty.status} />
                        </div>

                        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                          <div className="rounded-md bg-muted p-3">
                            <p className="text-xs text-muted-foreground">Creator</p>
                            <p className="mt-1 font-mono font-semibold">
                              {shortAddress(bounty.creator)}
                            </p>
                          </div>
                          <div className="rounded-md bg-muted p-3">
                            <p className="text-xs text-muted-foreground">Deadline</p>
                            <p className="mt-1 flex items-center gap-1 font-semibold">
                              <Clock className="h-3.5 w-3.5" />
                              {deadline}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                          {rulesUrl && (
                            <a
                              href={rulesUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              Aturan
                            </a>
                          )}
                          {proofUrl && (
                            <a
                              href={proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              Bukti worker
                            </a>
                          )}
                          <a
                            href={`${EXPLORER}/address/${bounty.address}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          >
                            BscScan
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>

                        {bounty.status === 1 && (
                          <div className="mt-5 border-t pt-5">
                            <label
                              htmlFor={`proof-${bounty.id}`}
                              className="text-sm font-medium"
                            >
                              URL bukti pekerjaan
                            </label>
                            <div className="mt-2 flex gap-2">
                              <input
                                id={`proof-${bounty.id}`}
                                type="url"
                                value={proofs[bounty.address] || ''}
                                onChange={(event) =>
                                  setProofs((current) => ({
                                    ...current,
                                    [bounty.address]: event.target.value,
                                  }))
                                }
                                placeholder="https://github.com/..."
                                className="ui-input min-w-0 flex-1"
                              />
                              <button
                                onClick={() =>
                                  account
                                    ? submitProof(bounty)
                                    : connectWallet()
                                }
                                disabled={busy === bounty.address}
                                className="ui-button w-10 px-0"
                                aria-label={`Submit bounty ${bounty.id}`}
                              >
                                {busy === bounty.address ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {bounty.status === 2 && (
                          <div className="mt-5 flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                            Submission dari {shortAddress(bounty.worker)} sedang
                            dinilai AI oracle.
                          </div>
                        )}

                        {bounty.status === 3 && (
                          <div className="mt-5 flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Lolos verifikasi. Hadiah sudah dikirim ke{' '}
                            {shortAddress(bounty.worker)}.
                          </div>
                        )}
                      </article>
                    )
                  })}
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
