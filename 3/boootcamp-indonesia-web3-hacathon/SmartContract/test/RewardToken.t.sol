// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {RewardToken} from "../src/RewardToken.sol";

contract RewardTokenTest is Test {
    RewardToken token;
    address owner = address(0x111);
    address minter = address(0x222);
    address user = address(0x333);

    function setUp() public {
        vm.prank(owner);
        token = new RewardToken(100 ether, owner);
    }

    function test_Constructor() public view {
        assertEq(token.owner(), owner);
        assertEq(token.balanceOf(owner), 100 ether);
        assertEq(token.totalSupply(), 100 ether);
    }

    function test_SetMinter() public {
        vm.prank(owner);
        token.setMinter(minter, true);
        assertTrue(token.isMinter(minter));
    }

    function test_Revert_SetMinterBukanOwner() public {
        vm.expectRevert(); // OwnableUnauthorizedAccount
        vm.prank(user);
        token.setMinter(minter, true);
    }

    function test_Revert_SetMinterAlamatNol() public {
        vm.prank(owner);
        vm.expectRevert(RewardToken.AlamatNol.selector);
        token.setMinter(address(0), true);
    }

    function test_MintSukses() public {
        vm.startPrank(owner);
        token.setMinter(minter, true);
        token.mint(user, 50 ether); // Owner can mint directly
        vm.stopPrank();

        vm.prank(minter);
        token.mint(user, 50 ether); // Minter can also mint

        assertEq(token.balanceOf(user), 100 ether);
    }

    function test_Revert_MintBukanMinter() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(RewardToken.BukanMinter.selector, user));
        token.mint(user, 50 ether);
    }

    function test_Revert_MintMelebihiMaxSupply() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        uint256 sisa = token.MAX_SUPPLY() - token.totalSupply();

        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(RewardToken.MelebihiMaxSupply.selector, sisa + 1, sisa));
        token.mint(user, sisa + 1);
    }

    function test_Burn() public {
        vm.startPrank(owner);
        assertTrue(token.transfer(user, 50 ether));
        vm.stopPrank();

        vm.prank(user);
        token.burn(20 ether);

        assertEq(token.balanceOf(user), 30 ether);
    }

    function test_Revert_BurnMelebihiSaldo() public {
        vm.prank(owner);
        assertTrue(token.transfer(user, 50 ether));

        vm.prank(user);
        vm.expectRevert(); // ERC20InsufficientBalance
        token.burn(60 ether);
    }

    function test_SetMinter_CabutAkses() public {
        vm.startPrank(owner);
        token.setMinter(minter, true);
        assertTrue(token.isMinter(minter));

        token.setMinter(minter, false);
        assertTrue(!token.isMinter(minter));
        vm.stopPrank();
    }
}
