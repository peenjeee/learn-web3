// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {RewardToken} from "../src/RewardToken.sol";
import {Faucet} from "../src/Faucet.sol";

contract DeployAll is Script {
    function run() public returns (RewardToken, Faucet) {
        // Menggunakan Private Key akun ke-0 bawaan Anvil
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy RewardToken (Initial supply 500,000, sisa 500,000 untuk Faucet)
        RewardToken token = new RewardToken(500000 ether, deployer);
        console2.log("RewardToken deployed at:", address(token));

        // 2. Deploy Faucet
        Faucet faucet = new Faucet(token);
        console2.log("Faucet deployed at:", address(faucet));

        // 3. Beri izin Faucet untuk nge-mint token
        token.setMinter(address(faucet), true);
        console2.log("Sukses: Faucet sekarang memiliki hak sebagai minter!");

        vm.stopBroadcast();
        
        return (token, faucet);
    }
}
