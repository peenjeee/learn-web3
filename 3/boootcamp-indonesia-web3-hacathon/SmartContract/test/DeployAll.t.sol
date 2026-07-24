// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DeployAll} from "../script/DeployAll.s.sol";
import {RewardToken} from "../src/RewardToken.sol";
import {Faucet} from "../src/Faucet.sol";

contract DeployAllTest is Test {
    DeployAll deployer;

    function setUp() public {
        deployer = new DeployAll();
    }

    function test_RunDeployAll() public {
        (RewardToken token, Faucet faucet) = deployer.run();
        
        // Pastikan token dan faucet berhasil di-deploy
        assertTrue(address(token) != address(0));
        assertTrue(address(faucet) != address(0));
        
        // Pastikan Faucet mengacu ke RewardToken yang benar
        assertEq(address(faucet.token()), address(token));
        
        // Pastikan Faucet diberi hak akses minter
        assertTrue(token.isMinter(address(faucet)));
        
        // Pastikan initial supply (500,000) masuk ke deployer
        address deployerAddr = vm.addr(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80);
        assertEq(token.balanceOf(deployerAddr), 500000 ether);
        
        // Pastikan Max Supply sesuai ketentuan
        assertEq(token.MAX_SUPPLY(), 1000000 ether);
    }
}
