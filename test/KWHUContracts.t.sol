// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {KWHUToken} from "../src/KWHUToken.sol";
import {KWHUVault} from "../src/KWHUVault.sol";
import {KWHUMarketplace} from "../src/KWHUMarketplace.sol";

contract KWHUContractsTest is Test {
    uint256 internal constant ONE_KWHU = 1e18;
    uint64 internal constant FULFILLMENT_TIMEOUT = 3 days;

    address internal owner = makeAddr("owner");
    address internal treasury = makeAddr("treasury");
    address internal buyer = makeAddr("buyer");
    address internal seller = makeAddr("seller");
    address internal otherBuyer = makeAddr("otherBuyer");

    KWHUToken internal token;
    KWHUVault internal vault;
    KWHUMarketplace internal marketplace;

    function setUp() public {
        vm.startPrank(owner);

        KWHUToken tokenImplementation = new KWHUToken();
        KWHUVault vaultImplementation = new KWHUVault();
        KWHUMarketplace marketplaceImplementation = new KWHUMarketplace();

        token = KWHUToken(
            address(
                new ERC1967Proxy(
                    address(tokenImplementation),
                    abi.encodeCall(
                        KWHUToken.initialize,
                        (owner, "KiloWatt-Hour Unit", "KWHU")
                    )
                )
            )
        );

        vault = KWHUVault(
            address(
                new ERC1967Proxy(
                    address(vaultImplementation),
                    abi.encodeCall(KWHUVault.initialize, (owner, address(token), 100 * ONE_KWHU))
                )
            )
        );

        marketplace = KWHUMarketplace(
            address(
                new ERC1967Proxy(
                    address(marketplaceImplementation),
                    abi.encodeCall(
                        KWHUMarketplace.initialize,
                        (owner, address(token), treasury, FULFILLMENT_TIMEOUT)
                    )
                )
            )
        );

        token.setMinter(address(vault), true);
        token.setTransferOperator(address(marketplace), true);

        vm.stopPrank();
    }

    function testClaimSignupGrantOnce() public {
        vm.prank(buyer);
        vault.claimSignupGrant();

        assertEq(token.balanceOf(buyer), 100 * ONE_KWHU);
        assertTrue(vault.hasClaimed(buyer));

        vm.expectRevert(abi.encodeWithSelector(KWHUVault.AlreadyClaimed.selector, buyer));
        vm.prank(buyer);
        vault.claimSignupGrant();
    }

    function testDirectTransferIsBlocked() public {
        vm.prank(buyer);
        vault.claimSignupGrant();

        vm.expectRevert(
            abi.encodeWithSelector(KWHUToken.UnauthorizedTransferOperator.selector, buyer)
        );
        vm.prank(buyer);
        token.transfer(otherBuyer, ONE_KWHU);
    }

    function testPurchaseFulfillAndRelease() public {
        vm.prank(buyer);
        vault.claimSignupGrant();

        vm.prank(seller);
        uint256 listingId = marketplace.createListing(
            KWHUMarketplace.ListingType.Goods,
            10 * ONE_KWHU,
            5,
            "ipfs://listing-1"
        );

        vm.prank(buyer);
        token.approve(address(marketplace), 10 * ONE_KWHU);

        vm.prank(buyer);
        uint256 orderId = marketplace.purchase(listingId, 1);

        vm.prank(seller);
        marketplace.markFulfilled(orderId);

        vm.prank(buyer);
        marketplace.confirmFulfillment(orderId);

        assertEq(token.balanceOf(seller), 9_950_000_000_000_000_000);
        assertEq(token.balanceOf(treasury), 50_000_000_000_000_000);
    }

    function testBuyerCanCancelBeforeFulfillment() public {
        vm.prank(buyer);
        vault.claimSignupGrant();

        vm.prank(seller);
        uint256 listingId = marketplace.createListing(
            KWHUMarketplace.ListingType.Services,
            20 * ONE_KWHU,
            2,
            "ipfs://listing-2"
        );

        vm.prank(buyer);
        token.approve(address(marketplace), 20 * ONE_KWHU);

        vm.prank(buyer);
        uint256 orderId = marketplace.purchase(listingId, 1);

        vm.prank(buyer);
        marketplace.cancelOrder(orderId);

        KWHUMarketplace.Listing memory listing = marketplace.getListing(listingId);

        assertEq(token.balanceOf(buyer), 100 * ONE_KWHU);
        assertEq(token.balanceOf(address(marketplace)), 0);
        assertEq(listing.quantityAvailable, 2);
        assertTrue(listing.active);
    }

    function testExpiredFulfillmentCanBeEscalatedAndRefunded() public {
        vm.prank(buyer);
        vault.claimSignupGrant();

        vm.prank(seller);
        uint256 listingId = marketplace.createListing(
            KWHUMarketplace.ListingType.Goods,
            15 * ONE_KWHU,
            1,
            "ipfs://listing-3"
        );

        vm.prank(buyer);
        token.approve(address(marketplace), 15 * ONE_KWHU);

        vm.prank(buyer);
        uint256 orderId = marketplace.purchase(listingId, 1);

        vm.prank(seller);
        marketplace.markFulfilled(orderId);

        vm.warp(block.timestamp + FULFILLMENT_TIMEOUT + 1);
        marketplace.escalateExpiredOrder(orderId);

        vm.prank(owner);
        marketplace.resolveDispute(orderId, false);

        assertEq(token.balanceOf(buyer), 100 * ONE_KWHU);
        assertEq(token.balanceOf(seller), 0);
        assertEq(token.balanceOf(treasury), 0);
    }

    function testCannotConfirmAfterDeadline() public {
        vm.prank(buyer);
        vault.claimSignupGrant();

        vm.prank(seller);
        uint256 listingId = marketplace.createListing(
            KWHUMarketplace.ListingType.Services,
            12 * ONE_KWHU,
            1,
            "ipfs://listing-4"
        );

        vm.prank(buyer);
        token.approve(address(marketplace), 12 * ONE_KWHU);

        vm.prank(buyer);
        uint256 orderId = marketplace.purchase(listingId, 1);

        vm.prank(seller);
        marketplace.markFulfilled(orderId);

        vm.warp(block.timestamp + FULFILLMENT_TIMEOUT + 1);

        vm.expectRevert(
            abi.encodeWithSelector(KWHUMarketplace.ConfirmationWindowClosed.selector, orderId)
        );
        vm.prank(buyer);
        marketplace.confirmFulfillment(orderId);
    }
}
