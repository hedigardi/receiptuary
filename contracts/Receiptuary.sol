// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title Receiptuary
/// @notice Anchors SHA-256 hashes of receipt files so documents can be verified later.
contract Receiptuary {
    // Stored by file hash so verification is an O(1) lookup by bytes32 fingerprint.
    struct Receipt {
        string issuerName;
        uint256 timestamp;
        address registeredBy;
        bool isRegistered;
    }

    mapping(bytes32 => Receipt) private _receipts;
    // Issuer approvals are maintained as an optional trust directory for clients/admin tools.
    mapping(address => bool) private _approvedIssuers;
    // Immutable fee configuration is set once at deployment to avoid runtime reconfiguration risk.
    IERC20 public immutable feeToken;
    address public immutable feeRecipient;
    uint256 public immutable feeAmount;
    address public owner;

    event ReceiptRegistered(
        bytes32 indexed fileHash,
        string issuerName,
        address indexed registeredBy
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event IssuerApprovalUpdated(address indexed issuer, bool approved);

    modifier onlyOwner() {
        require(msg.sender == owner, "Receiptuary: Only owner");
        _;
    }

    constructor(address feeTokenAddress, address feeRecipientAddress, uint256 feeAmountValue) {
        require(feeTokenAddress != address(0), "Receiptuary: Invalid fee token");
        require(feeRecipientAddress != address(0), "Receiptuary: Invalid fee recipient");

        feeToken = IERC20(feeTokenAddress);
        feeRecipient = feeRecipientAddress;
        feeAmount = feeAmountValue;
        owner = msg.sender;
        _approvedIssuers[msg.sender] = true;

        emit OwnershipTransferred(address(0), msg.sender);
        emit IssuerApprovalUpdated(msg.sender, true);
    }

    function registerReceipt(bytes32 fileHash, string calldata issuerName) external {
        require(!_receipts[fileHash].isRegistered, "Receiptuary: Hash already registered");
        require(bytes(issuerName).length > 0, "Receiptuary: Issuer name cannot be empty");

        // If a fee is configured, registration requires a successful token transfer first.
        if (feeAmount > 0) {
            bool paymentOk = feeToken.transferFrom(msg.sender, feeRecipient, feeAmount);
            require(paymentOk, "Receiptuary: Fee transfer failed");
        }

        _receipts[fileHash] = Receipt({
            issuerName: issuerName,
            timestamp: block.timestamp,
            registeredBy: msg.sender,
            isRegistered: true
        });

        emit ReceiptRegistered(fileHash, issuerName, msg.sender);
    }

    function getFeeConfig() external view returns (address token, address recipient, uint256 amount) {
        return (address(feeToken), feeRecipient, feeAmount);
    }

    function setIssuerApproval(address issuer, bool approved) external onlyOwner {
        require(issuer != address(0), "Receiptuary: Invalid issuer");
        _approvedIssuers[issuer] = approved;

        emit IssuerApprovalUpdated(issuer, approved);
    }

    function isIssuerApproved(address issuer) external view returns (bool) {
        return _approvedIssuers[issuer];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Receiptuary: Invalid owner");
        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function getReceipt(bytes32 fileHash)
        external
        view
        returns (
            string memory issuerName,
            uint256 timestamp,
            address registeredBy,
            bool isRegistered
        )
    {
        Receipt memory receipt = _receipts[fileHash];

        // Return a full snapshot so clients can display issuer details and verification metadata.
        return (
            receipt.issuerName,
            receipt.timestamp,
            receipt.registeredBy,
            receipt.isRegistered
        );
    }
}
