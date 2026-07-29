FACTORY_ABI = [
    {
        "type": "function",
        "name": "oracle",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
    },
    {
        "type": "function",
        "name": "totalBounties",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "type": "function",
        "name": "bounties",
        "stateMutability": "view",
        "inputs": [{"name": "", "type": "uint256"}],
        "outputs": [{"name": "", "type": "address"}],
    },
]

ESCROW_ABI = [
    {
        "type": "function",
        "name": "status",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint8"}],
    },
    {
        "type": "function",
        "name": "worker",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
    },
    {
        "type": "function",
        "name": "rulesURI",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "string"}],
    },
    {
        "type": "function",
        "name": "proofURI",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "string"}],
    },
    {
        "type": "function",
        "name": "fulfillVerification",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "eligible", "type": "bool"}],
        "outputs": [],
    },
]

STATUS_DISUBMIT = 2

