// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract KWHUEnergySettlement is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    uint256 public constant TOKEN_WEI_PER_WH = 1e15;

    error ZeroAddress();
    error InvalidMeterId();
    error MeterAlreadyRegistered(bytes32 meterId);
    error MeterNotFound(bytes32 meterId);
    error NotMeterOwner(address account);
    error MeterInactive(bytes32 meterId);
    error InvalidEscrowAmount();
    error InvalidEndTime(uint64 endTime);
    error AgreementNotFound(uint256 agreementId);
    error AgreementInactive(uint256 agreementId);
    error NotBuyer(address account);
    error ActiveAgreementExists(bytes32 meterId, uint256 agreementId);
    error InvalidEnergyAmount();
    error DuplicateReading(bytes32 readingId);
    error AgreementExpired(uint256 agreementId, uint64 endTime);
    error InsufficientEscrow(uint256 requiredAmount, uint256 remainingEscrow);
    error UnauthorizedMeteringOperator(address account);

    event MeterRegistered(
        bytes32 indexed meterId,
        address indexed owner,
        string metadataURI,
        string sourceType
    );
    event MeterActiveUpdated(bytes32 indexed meterId, bool active);
    event MeteringOperatorUpdated(address indexed account, bool allowed);
    event AgreementCreated(
        uint256 indexed agreementId,
        bytes32 indexed meterId,
        address indexed buyer,
        address seller,
        uint256 escrowAmount,
        uint64 endTime
    );
    event AgreementToppedUp(uint256 indexed agreementId, uint256 amount, uint256 remainingEscrow);
    event AgreementClosed(uint256 indexed agreementId, uint256 refundedAmount);
    event ReadingSettled(
        uint256 indexed agreementId,
        bytes32 indexed readingId,
        bytes32 indexed meterId,
        uint256 energyWh,
        uint256 payoutAmount,
        uint64 readingTimestamp,
        bytes32 payloadHash,
        uint256 remainingEscrow
    );

    struct Meter {
        address owner;
        string metadataURI;
        string sourceType;
        bool active;
        uint64 createdAt;
    }

    struct Agreement {
        bytes32 meterId;
        address buyer;
        address seller;
        uint256 totalEscrow;
        uint256 remainingEscrow;
        uint256 settledEnergyWh;
        uint256 settledAmount;
        uint64 endTime;
        uint64 createdAt;
        uint64 lastSettledAt;
        bool active;
    }

    IERC20 public token;
    uint256 public nextAgreementId;

    mapping(bytes32 => Meter) private meters;
    mapping(uint256 => Agreement) private agreements;
    mapping(bytes32 => uint256) private activeAgreementIdsByMeter;
    mapping(bytes32 => bool) public settledReadingIds;
    mapping(address => bool) public meteringOperators;

    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner, address tokenAddress) external initializer {
        if (initialOwner == address(0) || tokenAddress == address(0)) {
            revert ZeroAddress();
        }

        __Ownable_init(initialOwner);
        __Pausable_init();

        token = IERC20(tokenAddress);
    }

    function registerMeter(
        bytes32 meterId,
        string calldata metadataURI,
        string calldata sourceType
    ) external whenNotPaused {
        if (meterId == bytes32(0)) {
            revert InvalidMeterId();
        }
        if (meters[meterId].owner != address(0)) {
            revert MeterAlreadyRegistered(meterId);
        }

        meters[meterId] = Meter({
            owner: _msgSender(),
            metadataURI: metadataURI,
            sourceType: sourceType,
            active: true,
            createdAt: uint64(block.timestamp)
        });

        emit MeterRegistered(meterId, _msgSender(), metadataURI, sourceType);
    }

    function setMeterActive(bytes32 meterId, bool active) external whenNotPaused {
        Meter storage meter = _getMeterStorage(meterId);

        if (meter.owner != _msgSender()) {
            revert NotMeterOwner(_msgSender());
        }

        meter.active = active;
        emit MeterActiveUpdated(meterId, active);
    }

    function setMeteringOperator(address account, bool allowed) external onlyOwner {
        if (account == address(0)) {
            revert ZeroAddress();
        }

        meteringOperators[account] = allowed;
        emit MeteringOperatorUpdated(account, allowed);
    }

    function createAgreement(bytes32 meterId, uint256 escrowAmount, uint64 endTime)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 agreementId)
    {
        Meter storage meter = _getMeterStorage(meterId);

        if (!meter.active) {
            revert MeterInactive(meterId);
        }
        if (escrowAmount == 0) {
            revert InvalidEscrowAmount();
        }
        if (endTime <= block.timestamp) {
            revert InvalidEndTime(endTime);
        }
        if (activeAgreementIdsByMeter[meterId] != 0) {
            revert ActiveAgreementExists(meterId, activeAgreementIdsByMeter[meterId]);
        }

        token.safeTransferFrom(_msgSender(), address(this), escrowAmount);

        agreementId = ++nextAgreementId;
        agreements[agreementId] = Agreement({
            meterId: meterId,
            buyer: _msgSender(),
            seller: meter.owner,
            totalEscrow: escrowAmount,
            remainingEscrow: escrowAmount,
            settledEnergyWh: 0,
            settledAmount: 0,
            endTime: endTime,
            createdAt: uint64(block.timestamp),
            lastSettledAt: 0,
            active: true
        });
        activeAgreementIdsByMeter[meterId] = agreementId;

        emit AgreementCreated(
            agreementId,
            meterId,
            _msgSender(),
            meter.owner,
            escrowAmount,
            endTime
        );
    }

    function topUpAgreement(uint256 agreementId, uint256 amount)
        external
        whenNotPaused
        nonReentrant
    {
        Agreement storage agreement = _getAgreementStorage(agreementId);

        if (agreement.buyer != _msgSender()) {
            revert NotBuyer(_msgSender());
        }
        if (!agreement.active) {
            revert AgreementInactive(agreementId);
        }
        if (agreement.endTime <= block.timestamp) {
            revert AgreementExpired(agreementId, agreement.endTime);
        }
        if (amount == 0) {
            revert InvalidEscrowAmount();
        }

        token.safeTransferFrom(_msgSender(), address(this), amount);

        agreement.totalEscrow += amount;
        agreement.remainingEscrow += amount;

        emit AgreementToppedUp(agreementId, amount, agreement.remainingEscrow);
    }

    function closeAgreement(uint256 agreementId) external whenNotPaused nonReentrant {
        Agreement storage agreement = _getAgreementStorage(agreementId);

        if (agreement.buyer != _msgSender()) {
            revert NotBuyer(_msgSender());
        }
        if (!agreement.active) {
            revert AgreementInactive(agreementId);
        }

        uint256 refundAmount = agreement.remainingEscrow;
        agreement.active = false;
        agreement.remainingEscrow = 0;
        activeAgreementIdsByMeter[agreement.meterId] = 0;

        if (refundAmount != 0) {
            token.safeTransfer(agreement.buyer, refundAmount);
        }

        emit AgreementClosed(agreementId, refundAmount);
    }

    function settleReading(
        uint256 agreementId,
        bytes32 readingId,
        uint256 energyWh,
        uint64 readingTimestamp,
        bytes32 payloadHash
    ) external whenNotPaused nonReentrant {
        if (!meteringOperators[_msgSender()]) {
            revert UnauthorizedMeteringOperator(_msgSender());
        }
        if (readingId == bytes32(0)) {
            revert DuplicateReading(readingId);
        }
        if (settledReadingIds[readingId]) {
            revert DuplicateReading(readingId);
        }
        if (energyWh == 0) {
            revert InvalidEnergyAmount();
        }

        Agreement storage agreement = _getAgreementStorage(agreementId);

        if (!agreement.active) {
            revert AgreementInactive(agreementId);
        }
        if (readingTimestamp > agreement.endTime) {
            revert AgreementExpired(agreementId, agreement.endTime);
        }

        uint256 payoutAmount = energyWh * TOKEN_WEI_PER_WH;
        if (agreement.remainingEscrow < payoutAmount) {
            revert InsufficientEscrow(payoutAmount, agreement.remainingEscrow);
        }

        settledReadingIds[readingId] = true;

        agreement.remainingEscrow -= payoutAmount;
        agreement.settledEnergyWh += energyWh;
        agreement.settledAmount += payoutAmount;
        agreement.lastSettledAt = readingTimestamp;

        token.safeTransfer(agreement.seller, payoutAmount);

        emit ReadingSettled(
            agreementId,
            readingId,
            agreement.meterId,
            energyWh,
            payoutAmount,
            readingTimestamp,
            payloadHash,
            agreement.remainingEscrow
        );
    }

    function getMeter(bytes32 meterId) external view returns (Meter memory) {
        return _getMeterStorage(meterId);
    }

    function getAgreement(uint256 agreementId) external view returns (Agreement memory) {
        return _getAgreementStorage(agreementId);
    }

    function getActiveAgreementId(bytes32 meterId) external view returns (uint256) {
        return activeAgreementIdsByMeter[meterId];
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function _getMeterStorage(bytes32 meterId) internal view returns (Meter storage meter) {
        meter = meters[meterId];
        if (meter.owner == address(0)) {
            revert MeterNotFound(meterId);
        }
    }

    function _getAgreementStorage(uint256 agreementId)
        internal
        view
        returns (Agreement storage agreement)
    {
        agreement = agreements[agreementId];
        if (agreement.buyer == address(0)) {
            revert AgreementNotFound(agreementId);
        }
    }

    uint256[50] private __gap;
}
