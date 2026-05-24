// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title Receiptuary
/// @notice Anchors SHA-256 hashes of receipt files so documents can be verified later.
contract Receiptuary {
    struct Receipt {
        string issuerName;
        string referenceId;
        uint256 timestamp;
        address registeredBy;
        bool isRegistered;
    }

    mapping(bytes32 => Receipt) private _receipts;
    IERC20 public immutable feeToken;
    address public immutable feeRecipient;
    uint256 public immutable feeAmount;

    event ReceiptRegistered(
        bytes32 indexed fileHash,
        string issuerName,
        address indexed registeredBy
    );

    constructor(address feeTokenAddress, address feeRecipientAddress, uint256 feeAmountValue) {
        require(feeTokenAddress != address(0), "Receiptuary: Invalid fee token");
        require(feeRecipientAddress != address(0), "Receiptuary: Invalid fee recipient");

        feeToken = IERC20(feeTokenAddress);
        feeRecipient = feeRecipientAddress;
        feeAmount = feeAmountValue;
    }

    function registerReceipt(
        bytes32 fileHash,
        string calldata issuerName,
        string calldata referenceId
    ) external {
        require(!_receipts[fileHash].isRegistered, "Receiptuary: Hash already registered");
        require(bytes(issuerName).length > 0, "Receiptuary: Issuer name cannot be empty");

        if (feeAmount > 0) {
            bool paymentOk = feeToken.transferFrom(msg.sender, feeRecipient, feeAmount);
            require(paymentOk, "Receiptuary: Fee transfer failed");
        }

        _receipts[fileHash] = Receipt({
            issuerName: issuerName,
            referenceId: referenceId,
            timestamp: block.timestamp,
            registeredBy: msg.sender,
            isRegistered: true
        });

        emit ReceiptRegistered(fileHash, issuerName, msg.sender);
    }

    function getFeeConfig() external view returns (address token, address recipient, uint256 amount) {
        return (address(feeToken), feeRecipient, feeAmount);
    }

    function getReceipt(bytes32 fileHash)
        external
        view
        returns (
            string memory issuerName,
            string memory referenceId,
            uint256 timestamp,
            address registeredBy,
            bool isRegistered
        )
    {
        Receipt memory receipt = _receipts[fileHash];

        return (
            receipt.issuerName,
            receipt.referenceId,
            receipt.timestamp,
            receipt.registeredBy,
            receipt.isRegistered
        );
    }
}
