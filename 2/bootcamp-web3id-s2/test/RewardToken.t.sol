// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {RewardToken} from "../src/RewardToken.sol";

contract RewardTokenTest is Test {
    RewardToken token;
    address owner = address(0xA11CE);
    address escrow = address(0xE5C0);
    address bob = address(0xB0B);

    function setUp() public {
        token = new RewardToken(1000 ether, owner);
    }

    function test_InitialSupplyKeOwner() public view {
        assertEq(token.balanceOf(owner), 1000 ether);
    }

    function test_MinterBisaMint() public {
        vm.prank(owner);
        token.setMinter(escrow, true);
        vm.prank(escrow);
        token.mint(bob, 50 ether);
        assertEq(token.balanceOf(bob), 50 ether);
    }

    function test_RevertKalauBukanMinter() public {
        vm.expectRevert(abi.encodeWithSelector(RewardToken.BukanMinter.selector, bob));
        vm.prank(bob);
        token.mint(bob, 1 ether);
    }

    function test_RevertKalauLewatMaxSupply() public {
        uint256 max = token.MAX_SUPPLY();
        vm.prank(owner);
        vm.expectRevert();
        token.mint(owner, max);
    }

    function test_Burn() public {
        vm.prank(owner);
        token.burn(400 ether);
        assertEq(token.balanceOf(owner), 600 ether);
    }
}