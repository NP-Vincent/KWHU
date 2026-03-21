// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract KWHUMarketplace is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MARKETPLACE_FEE_BPS = 50;

    enum ListingType {
        Goods,
        Services
    }

    enum OrderStatus {
        None,
        PendingFulfillment,
        Fulfilled,
        Cancelled,
        Released,
        Refunded,
        Disputed
    }

    error ZeroAddress();
    error InvalidListing();
    error InvalidQuantity();
    error ListingNotFound(uint256 listingId);
    error OrderNotFound(uint256 orderId);
    error InactiveListing(uint256 listingId);
    error NotSeller(address account);
    error NotBuyer(address account);
    error InvalidOrderState(uint256 orderId, OrderStatus status);
    error InsufficientQuantity(uint256 requested, uint256 available);
    error SelfPurchaseNotAllowed();
    error FulfillmentTimeoutNotElapsed(uint256 orderId);
    error ConfirmationWindowClosed(uint256 orderId);

    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        ListingType listingType,
        uint256 pricePerUnit,
        uint256 quantityAvailable,
        string metadataURI
    );
    event ListingUpdated(
        uint256 indexed listingId,
        ListingType listingType,
        uint256 pricePerUnit,
        uint256 quantityAvailable,
        bool active,
        string metadataURI
    );
    event ListingDeactivated(uint256 indexed listingId);
    event OrderPurchased(
        uint256 indexed orderId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 quantity,
        uint256 totalPrice
    );
    event OrderCancelled(uint256 indexed orderId);
    event OrderFulfilled(uint256 indexed orderId, uint64 confirmBy);
    event OrderDisputed(uint256 indexed orderId, string reason);
    event OrderAutoEscalated(uint256 indexed orderId);
    event OrderReleased(uint256 indexed orderId, uint256 sellerAmount, uint256 feeAmount);
    event OrderRefunded(uint256 indexed orderId);
    event TreasuryUpdated(address indexed treasury);
    event FulfillmentTimeoutUpdated(uint64 timeoutSeconds);

    struct Listing {
        address seller;
        ListingType listingType;
        uint256 pricePerUnit;
        uint256 quantityAvailable;
        bool active;
        string metadataURI;
    }

    struct Order {
        uint256 listingId;
        address buyer;
        address seller;
        uint256 quantity;
        uint256 totalPrice;
        OrderStatus status;
        uint64 createdAt;
        uint64 fulfilledAt;
        uint64 confirmBy;
        string disputeReason;
    }

    IERC20 public token;
    address public treasury;
    uint64 public fulfillmentTimeout;
    uint256 public nextListingId;
    uint256 public nextOrderId;

    mapping(uint256 => Listing) private listings;
    mapping(uint256 => Order) private orders;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address tokenAddress,
        address treasuryAddress,
        uint64 fulfillmentTimeoutSeconds
    ) external initializer {
        if (
            initialOwner == address(0) ||
            tokenAddress == address(0) ||
            treasuryAddress == address(0)
        ) {
            revert ZeroAddress();
        }
        if (fulfillmentTimeoutSeconds == 0) {
            revert InvalidQuantity();
        }

        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        token = IERC20(tokenAddress);
        treasury = treasuryAddress;
        fulfillmentTimeout = fulfillmentTimeoutSeconds;
    }

    function createListing(
        ListingType listingType,
        uint256 pricePerUnit,
        uint256 quantityAvailable,
        string calldata metadataURI
    ) external whenNotPaused returns (uint256 listingId) {
        if (pricePerUnit == 0 || quantityAvailable == 0) {
            revert InvalidListing();
        }

        listingId = ++nextListingId;
        listings[listingId] = Listing({
            seller: _msgSender(),
            listingType: listingType,
            pricePerUnit: pricePerUnit,
            quantityAvailable: quantityAvailable,
            active: true,
            metadataURI: metadataURI
        });

        emit ListingCreated(
            listingId,
            _msgSender(),
            listingType,
            pricePerUnit,
            quantityAvailable,
            metadataURI
        );
    }

    function updateListing(
        uint256 listingId,
        ListingType listingType,
        uint256 pricePerUnit,
        uint256 quantityAvailable,
        bool active,
        string calldata metadataURI
    ) external whenNotPaused {
        Listing storage listing = _getListingStorage(listingId);

        if (listing.seller != _msgSender()) {
            revert NotSeller(_msgSender());
        }
        if (pricePerUnit == 0) {
            revert InvalidListing();
        }
        if (active && quantityAvailable == 0) {
            revert InvalidQuantity();
        }

        listing.listingType = listingType;
        listing.pricePerUnit = pricePerUnit;
        listing.quantityAvailable = quantityAvailable;
        listing.active = active && quantityAvailable > 0;
        listing.metadataURI = metadataURI;

        emit ListingUpdated(
            listingId,
            listingType,
            pricePerUnit,
            quantityAvailable,
            listing.active,
            metadataURI
        );
    }

    function deactivateListing(uint256 listingId) external whenNotPaused {
        Listing storage listing = _getListingStorage(listingId);

        if (listing.seller != _msgSender()) {
            revert NotSeller(_msgSender());
        }

        listing.active = false;
        emit ListingDeactivated(listingId);
    }

    function purchase(uint256 listingId, uint256 quantity)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 orderId)
    {
        Listing storage listing = _getListingStorage(listingId);

        if (!listing.active) {
            revert InactiveListing(listingId);
        }
        if (listing.seller == _msgSender()) {
            revert SelfPurchaseNotAllowed();
        }
        if (quantity == 0) {
            revert InvalidQuantity();
        }
        if (listing.quantityAvailable < quantity) {
            revert InsufficientQuantity(quantity, listing.quantityAvailable);
        }

        uint256 totalPrice = listing.pricePerUnit * quantity;

        listing.quantityAvailable -= quantity;
        if (listing.quantityAvailable == 0) {
            listing.active = false;
        }

        token.safeTransferFrom(_msgSender(), address(this), totalPrice);

        orderId = ++nextOrderId;
        orders[orderId] = Order({
            listingId: listingId,
            buyer: _msgSender(),
            seller: listing.seller,
            quantity: quantity,
            totalPrice: totalPrice,
            status: OrderStatus.PendingFulfillment,
            createdAt: uint64(block.timestamp),
            fulfilledAt: 0,
            confirmBy: 0,
            disputeReason: ""
        });

        emit OrderPurchased(orderId, listingId, _msgSender(), quantity, totalPrice);
    }

    function cancelOrder(uint256 orderId) external whenNotPaused nonReentrant {
        Order storage order = _getOrderStorage(orderId);
        Listing storage listing = listings[order.listingId];

        if (order.buyer != _msgSender()) {
            revert NotBuyer(_msgSender());
        }
        if (order.status != OrderStatus.PendingFulfillment) {
            revert InvalidOrderState(orderId, order.status);
        }

        order.status = OrderStatus.Cancelled;
        listing.quantityAvailable += order.quantity;
        listing.active = true;
        token.safeTransfer(order.buyer, order.totalPrice);

        emit OrderCancelled(orderId);
    }

    function markFulfilled(uint256 orderId) external whenNotPaused {
        Order storage order = _getOrderStorage(orderId);

        if (order.seller != _msgSender()) {
            revert NotSeller(_msgSender());
        }
        if (order.status != OrderStatus.PendingFulfillment) {
            revert InvalidOrderState(orderId, order.status);
        }

        order.status = OrderStatus.Fulfilled;
        order.fulfilledAt = uint64(block.timestamp);
        order.confirmBy = uint64(block.timestamp + fulfillmentTimeout);

        emit OrderFulfilled(orderId, order.confirmBy);
    }

    function confirmFulfillment(uint256 orderId) external whenNotPaused nonReentrant {
        Order storage order = _getOrderStorage(orderId);

        if (order.buyer != _msgSender()) {
            revert NotBuyer(_msgSender());
        }
        if (order.status != OrderStatus.Fulfilled) {
            revert InvalidOrderState(orderId, order.status);
        }
        if (block.timestamp > order.confirmBy) {
            revert ConfirmationWindowClosed(orderId);
        }

        _releaseOrder(orderId, order);
    }

    function openDispute(uint256 orderId, string calldata reason)
        external
        whenNotPaused
    {
        Order storage order = _getOrderStorage(orderId);

        if (order.buyer != _msgSender()) {
            revert NotBuyer(_msgSender());
        }
        if (order.status != OrderStatus.Fulfilled) {
            revert InvalidOrderState(orderId, order.status);
        }

        order.status = OrderStatus.Disputed;
        order.disputeReason = reason;

        emit OrderDisputed(orderId, reason);
    }

    function escalateExpiredOrder(uint256 orderId) external whenNotPaused {
        Order storage order = _getOrderStorage(orderId);

        if (order.status != OrderStatus.Fulfilled) {
            revert InvalidOrderState(orderId, order.status);
        }
        if (block.timestamp <= order.confirmBy) {
            revert FulfillmentTimeoutNotElapsed(orderId);
        }

        order.status = OrderStatus.Disputed;
        order.disputeReason = "AUTO_ESCALATED";

        emit OrderAutoEscalated(orderId);
    }

    function resolveDispute(uint256 orderId, bool releaseToSeller)
        external
        onlyOwner
        whenNotPaused
        nonReentrant
    {
        Order storage order = _getOrderStorage(orderId);

        if (order.status != OrderStatus.Disputed) {
            revert InvalidOrderState(orderId, order.status);
        }

        if (releaseToSeller) {
            _releaseOrder(orderId, order);
        } else {
            _refundOrder(orderId, order);
        }
    }

    function setTreasury(address treasuryAddress) external onlyOwner {
        if (treasuryAddress == address(0)) {
            revert ZeroAddress();
        }

        treasury = treasuryAddress;
        emit TreasuryUpdated(treasuryAddress);
    }

    function setFulfillmentTimeout(uint64 fulfillmentTimeoutSeconds) external onlyOwner {
        if (fulfillmentTimeoutSeconds == 0) {
            revert InvalidQuantity();
        }

        fulfillmentTimeout = fulfillmentTimeoutSeconds;
        emit FulfillmentTimeoutUpdated(fulfillmentTimeoutSeconds);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _getListingStorage(listingId);
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return _getOrderStorage(orderId);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function _releaseOrder(uint256 orderId, Order storage order) internal {
        uint256 feeAmount = (order.totalPrice * MARKETPLACE_FEE_BPS) / BPS_DENOMINATOR;
        uint256 sellerAmount = order.totalPrice - feeAmount;

        order.status = OrderStatus.Released;

        token.safeTransfer(order.seller, sellerAmount);
        if (feeAmount != 0) {
            token.safeTransfer(treasury, feeAmount);
        }

        emit OrderReleased(orderId, sellerAmount, feeAmount);
    }

    function _refundOrder(uint256 orderId, Order storage order) internal {
        order.status = OrderStatus.Refunded;
        token.safeTransfer(order.buyer, order.totalPrice);

        emit OrderRefunded(orderId);
    }

    function _getListingStorage(uint256 listingId)
        internal
        view
        returns (Listing storage listing)
    {
        listing = listings[listingId];
        if (listing.seller == address(0)) {
            revert ListingNotFound(listingId);
        }
    }

    function _getOrderStorage(uint256 orderId)
        internal
        view
        returns (Order storage order)
    {
        order = orders[orderId];
        if (order.buyer == address(0)) {
            revert OrderNotFound(orderId);
        }
    }

    uint256[50] private __gap;
}
