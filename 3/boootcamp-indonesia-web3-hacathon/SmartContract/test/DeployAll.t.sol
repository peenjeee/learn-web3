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
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddr = vm.addr(deployerPrivateKey);
        assertEq(token.balanceOf(deployerAddr), 500000 ether);
        
        // Pastikan Max Supply sesuai ketentuan
        assertEq(token.MAX_SUPPLY(), 1000000 ether);
    }
}
