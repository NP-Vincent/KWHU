// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import {IKWHUToken} from "./interfaces/IKWHUToken.sol";

contract KWHUVault is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    error ZeroAddress();
    error AlreadyClaimed(address account);

    event SignupGrantClaimed(address indexed account, uint256 amount);
    event AdminGrantIssued(address indexed account, uint256 amount);
    event SignupGrantAmountUpdated(uint256 amount);

    IKWHUToken public token;
    uint256 public signupGrantAmount;
    mapping(address => bool) public hasClaimed;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address tokenAddress,
        uint256 initialSignupGrantAmount
    ) external initializer {
        if (initialOwner == address(0) || tokenAddress == address(0)) {
            revert ZeroAddress();
        }

        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        token = IKWHUToken(tokenAddress);
        signupGrantAmount = initialSignupGrantAmount;
    }

    function claimSignupGrant() external whenNotPaused nonReentrant {
        if (hasClaimed[_msgSender()]) {
            revert AlreadyClaimed(_msgSender());
        }

        hasClaimed[_msgSender()] = true;
        token.mint(_msgSender(), signupGrantAmount);

        emit SignupGrantClaimed(_msgSender(), signupGrantAmount);
    }

    function grantTo(address account, uint256 amount) external onlyOwner whenNotPaused {
        if (account == address(0)) {
            revert ZeroAddress();
        }

        token.mint(account, amount);
        emit AdminGrantIssued(account, amount);
    }

    function setSignupGrantAmount(uint256 amount) external onlyOwner {
        signupGrantAmount = amount;
        emit SignupGrantAmountUpdated(amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    uint256[50] private __gap;
}
