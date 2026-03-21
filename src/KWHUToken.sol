// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract KWHUToken is
    Initializable,
    ERC20Upgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    error ZeroAddress();
    error UnauthorizedMinter(address account);
    error UnauthorizedTransferOperator(address account);

    event MinterUpdated(address indexed account, bool allowed);
    event TransferOperatorUpdated(address indexed account, bool allowed);

    mapping(address => bool) public minters;
    mapping(address => bool) public transferOperators;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        string memory name_,
        string memory symbol_
    ) external initializer {
        if (initialOwner == address(0)) {
            revert ZeroAddress();
        }

        __ERC20_init(name_, symbol_);
        __Ownable_init(initialOwner);
        __Pausable_init();
    }

    function mint(address to, uint256 amount) external whenNotPaused {
        if (!minters[_msgSender()]) {
            revert UnauthorizedMinter(_msgSender());
        }

        _mint(to, amount);
    }

    function setMinter(address account, bool allowed) external onlyOwner {
        if (account == address(0)) {
            revert ZeroAddress();
        }

        minters[account] = allowed;
        emit MinterUpdated(account, allowed);
    }

    function setTransferOperator(address account, bool allowed) external onlyOwner {
        if (account == address(0)) {
            revert ZeroAddress();
        }

        transferOperators[account] = allowed;
        emit TransferOperatorUpdated(account, allowed);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function _update(address from, address to, uint256 value) internal override {
        _requireNotPaused();

        if (from != address(0) && to != address(0) && !transferOperators[_msgSender()]) {
            revert UnauthorizedTransferOperator(_msgSender());
        }

        super._update(from, to, value);
    }

    uint256[50] private __gap;
}
