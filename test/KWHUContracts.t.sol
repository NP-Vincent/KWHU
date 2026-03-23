// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {KWHUToken} from "../src/KWHUToken.sol";
import {KWHUVault} from "../src/KWHUVault.sol";
import {KWHUMarketplace} from "../src/KWHUMarketplace.sol";
import {KWHUEnergySettlement} from "../src/KWHUEnergySettlement.sol";

contract KWHUContractsTest is Test {
    uint256 internal constant ONE_KWHU = 1e18;
    uint256 internal constant TOKEN_WEI_PER_WH = 1e15;
    uint64 internal constant FULFILLMENT_TIMEOUT = 3 days;

    address internal owner = makeAddr("owner");
    address internal treasury = makeAddr("treasury");
    address internal buyer = makeAddr("buyer");
    address internal seller = makeAddr("seller");
    address internal otherBuyer = makeAddr("otherBuyer");
    address internal meteringOperator = makeAddr("meteringOperator");

    KWHUToken internal token;
    KWHUVault internal vault;
    KWHUMarketplace internal marketplace;
    KWHUEnergySettlement internal energySettlement;

    function setUp() public {
        vm.startPrank(owner);

        KWHUToken tokenImplementation = new KWHUToken();
        KWHUVault vaultImplementation = new KWHUVault();
        KWHUMarketplace marketplaceImplementation = new KWHUMarketplace();
        KWHUEnergySettlement energySettlementImplementation = new KWHUEnergySettlement();

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

        energySettlement = KWHUEnergySettlement(
            address(
                new ERC1967Proxy(
                    address(energySettlementImplementation),
                    abi.encodeCall(KWHUEnergySettlement.initialize, (owner, address(token)))
                )
            )
        );

        token.setMinter(address(vault), true);
        token.setTransferOperator(address(marketplace), true);
        token.setTransferOperator(address(energySettlement), true);
        energySettlement.setMeteringOperator(meteringOperator, true);

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

    function testBuyerCanCreateTopUpAndCloseEnergyAgreement() public {
        bytes32 meterId = keccak256("meter-alpha");
        uint64 endTime = uint64(block.timestamp + 7 days);

        vm.prank(buyer);
        vault.claimSignupGrant();

        vm.prank(seller);
        energySettlement.registerMeter(meterId, "ipfs://meter-alpha", "renewable");

        vm.prank(buyer);
        token.approve(address(energySettlement), 40 * ONE_KWHU);

        vm.prank(buyer);
        uint256 agreementId = energySettlement.createAgreement(meterId, 25 * ONE_KWHU, endTime);

        vm.prank(buyer);
        energySettlement.topUpAgreement(agreementId, 15 * ONE_KWHU);

        KWHUEnergySettlement.Agreement memory agreement = energySettlement.getAgreement(
            agreementId
        );

        assertEq(agreement.totalEscrow, 40 * ONE_KWHU);
        assertEq(agreement.remainingEscrow, 40 * ONE_KWHU);
        assertEq(energySettlement.getActiveAgreementId(meterId), agreementId);

        vm.prank(buyer);
        energySettlement.closeAgreement(agreementId);

        KWHUEnergySettlement.Agreement memory closedAgreement = energySettlement.getAgreement(
            agreementId
        );

        assertFalse(closedAgreement.active);
        assertEq(closedAgreement.remainingEscrow, 0);
        assertEq(token.balanceOf(buyer), 100 * ONE_KWHU);
        assertEq(energySettlement.getActiveAgreementId(meterId), 0);
    }

    function testMeterReadingSettlementTransfersFromEscrowWithoutMint() public {
        bytes32 meterId = keccak256("meter-bravo");
        bytes32 readingId = keccak256("reading-1");
        uint64 endTime = uint64(block.timestamp + 7 days);
        uint256 totalSupplyBefore;

        vm.prank(buyer);
        vault.claimSignupGrant();
        totalSupplyBefore = token.totalSupply();

        vm.prank(seller);
        energySettlement.registerMeter(meterId, "ipfs://meter-bravo", "renewable");

        vm.prank(buyer);
        token.approve(address(energySettlement), 10 * ONE_KWHU);

        vm.prank(buyer);
        uint256 agreementId = energySettlement.createAgreement(meterId, 10 * ONE_KWHU, endTime);

        vm.prank(meteringOperator);
        energySettlement.settleReading(
            agreementId,
            readingId,
            1_500,
            uint64(block.timestamp + 1 hours),
            keccak256("payload-1")
        );

        KWHUEnergySettlement.Agreement memory agreement = energySettlement.getAgreement(
            agreementId
        );

        assertEq(token.balanceOf(seller), 1_500 * TOKEN_WEI_PER_WH);
        assertEq(agreement.remainingEscrow, 8_500 * TOKEN_WEI_PER_WH);
        assertEq(agreement.settledEnergyWh, 1_500);
        assertEq(agreement.settledAmount, 1_500 * TOKEN_WEI_PER_WH);
        assertEq(token.totalSupply(), totalSupplyBefore);
    }

    function testDuplicateEnergyReadingIsRejected() public {
        bytes32 meterId = keccak256("meter-charlie");
        bytes32 readingId = keccak256("reading-duplicate");
        uint64 endTime = uint64(block.timestamp + 7 days);

        vm.prank(buyer);
        vault.claimSignupGrant();

        vm.prank(seller);
        energySettlement.registerMeter(meterId, "ipfs://meter-charlie", "renewable");

        vm.prank(buyer);
        token.approve(address(energySettlement), 5 * ONE_KWHU);

        vm.prank(buyer);
        uint256 agreementId = energySettlement.createAgreement(meterId, 5 * ONE_KWHU, endTime);

        vm.prank(meteringOperator);
        energySettlement.settleReading(
            agreementId,
            readingId,
            1_000,
            uint64(block.timestamp + 30 minutes),
            keccak256("payload-2")
        );

        vm.expectRevert(
            abi.encodeWithSelector(KWHUEnergySettlement.DuplicateReading.selector, readingId)
        );
        vm.prank(meteringOperator);
        energySettlement.settleReading(
            agreementId,
            readingId,
            500,
            uint64(block.timestamp + 45 minutes),
            keccak256("payload-3")
        );
    }

    function testSettlementCannotExceedRemainingEscrow() public {
        bytes32 meterId = keccak256("meter-delta");
        bytes32 readingId = keccak256("reading-overflow");
        uint64 endTime = uint64(block.timestamp + 7 days);

        vm.prank(buyer);
        vault.claimSignupGrant();

        vm.prank(seller);
        energySettlement.registerMeter(meterId, "ipfs://meter-delta", "renewable");

        vm.prank(buyer);
        token.approve(address(energySettlement), ONE_KWHU);

        vm.prank(buyer);
        uint256 agreementId = energySettlement.createAgreement(meterId, ONE_KWHU, endTime);

        vm.expectRevert(
            abi.encodeWithSelector(
                KWHUEnergySettlement.InsufficientEscrow.selector,
                1_500 * TOKEN_WEI_PER_WH,
                ONE_KWHU
            )
        );
        vm.prank(meteringOperator);
        energySettlement.settleReading(
            agreementId,
            readingId,
            1_500,
            uint64(block.timestamp + 1 hours),
            keccak256("payload-4")
        );
    }

    function testClosingAgreementPreventsFurtherEnergySettlement() public {
        bytes32 meterId = keccak256("meter-echo");
        bytes32 readingId = keccak256("reading-after-close");
        uint64 endTime = uint64(block.timestamp + 7 days);

        vm.prank(buyer);
        vault.claimSignupGrant();

        vm.prank(seller);
        energySettlement.registerMeter(meterId, "ipfs://meter-echo", "renewable");

        vm.prank(buyer);
        token.approve(address(energySettlement), 3 * ONE_KWHU);

        vm.prank(buyer);
        uint256 agreementId = energySettlement.createAgreement(meterId, 3 * ONE_KWHU, endTime);

        vm.prank(buyer);
        energySettlement.closeAgreement(agreementId);

        vm.expectRevert(
            abi.encodeWithSelector(KWHUEnergySettlement.AgreementInactive.selector, agreementId)
        );
        vm.prank(meteringOperator);
        energySettlement.settleReading(
            agreementId,
            readingId,
            500,
            uint64(block.timestamp + 1 hours),
            keccak256("payload-5")
        );
    }
}
