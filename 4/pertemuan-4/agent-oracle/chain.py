from bnbagent_studio_core import get_wallet
from web3 import Web3

from abi import ESCROW_ABI, FACTORY_ABI, STATUS_DISUBMIT


class Chain:
    def __init__(self, rpc_url: str, factory_address: str):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not self.w3.is_connected():
            raise RuntimeError("gagal terhubung ke BNB Testnet")
        self.factory = self.w3.eth.contract(
            address=Web3.to_checksum_address(factory_address),
            abi=FACTORY_ABI,
        )
        self.wallet = get_wallet()

    def oracle(self) -> str:
        return self.factory.functions.oracle().call()

    def pending_bounties(self):
        for bounty_id in range(self.factory.functions.totalBounties().call()):
            address = self.factory.functions.bounties(bounty_id).call()
            escrow = self.w3.eth.contract(address=address, abi=ESCROW_ABI)
            if escrow.functions.status().call() == STATUS_DISUBMIT:
                yield (
                    bounty_id,
                    address,
                    escrow.functions.worker().call(),
                    escrow.functions.rulesURI().call(),
                    escrow.functions.proofURI().call(),
                )

    def send_verdict(self, escrow_address: str, eligible: bool) -> str:
        if self.oracle().lower() != self.wallet.address.lower():
            raise RuntimeError("wallet agent bukan oracle factory")

        escrow = self.w3.eth.contract(
            address=Web3.to_checksum_address(escrow_address),
            abi=ESCROW_ABI,
        )
        transaction = escrow.functions.fulfillVerification(eligible).build_transaction(
            {
                "from": self.wallet.address,
                "nonce": self.w3.eth.get_transaction_count(self.wallet.address, "pending"),
                "chainId": self.w3.eth.chain_id,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        transaction["gas"] = self.w3.eth.estimate_gas(transaction)
        signed = self.wallet.sign_transaction(transaction)
        tx_hash = self.w3.eth.send_raw_transaction(signed["rawTransaction"])
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt["status"] != 1:
            raise RuntimeError(f"transaksi gagal: {tx_hash.hex()}")
        return tx_hash.hex()

