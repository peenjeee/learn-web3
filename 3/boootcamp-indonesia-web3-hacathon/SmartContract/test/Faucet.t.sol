// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Faucet} from "../src/Faucet.sol";
import {RewardToken} from "../src/RewardToken.sol";

contract FaucetTest is Test {
    RewardToken token;
    Faucet faucet;
    address owner = address(0x123);
    address user = address(0x456);

    function setUp() public {
        vm.startPrank(owner);
        token = new RewardToken(1000 ether, owner);
        faucet = new Faucet(token);
        token.setMinter(address(faucet), true);
        vm.stopPrank();
    }

    function test_Constructor() public view {
        assertEq(address(faucet.token()), address(token));
        assertEq(faucet.DRIP_AMOUNT(), 100 ether);
        assertEq(faucet.COOLDOWN(), 1 days);
    }

    function test_RequestTokensSukses() public {
        vm.prank(user);
        
        // Pengecekan event
        vm.expectEmit(true, false, false, true);
        emit Faucet.TokensRequested(user, 100 ether);
        
        faucet.requestTokens();

        assertEq(token.balanceOf(user), 100 ether);
        assertEq(faucet.lastRequestTime(user), block.timestamp);
    }

    function test_Revert_RequestTokensMasihCooldown() public {
        vm.startPrank(user);
        faucet.requestTokens();

        vm.expectRevert(abi.encodeWithSelector(Faucet.MasihCooldown.selector, 1 days));
        faucet.requestTokens();
        vm.stopPrank();
    }

    function test_RequestTokensSetelahCooldown() public {
        vm.startPrank(user);
        faucet.requestTokens();

        vm.warp(block.timestamp + 1 days);
        faucet.requestTokens();
        
        assertEq(token.balanceOf(user), 200 ether);
        vm.stopPrank();
    }
}
