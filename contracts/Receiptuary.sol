// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

    event ReceiptRegistered(
        bytes32 indexed fileHash,
        string issuerName,
        address indexed registeredBy
    );

    function registerReceipt(
        bytes32 fileHash,
        string calldata issuerName,
        string calldata referenceId
    ) external {
        require(!_receipts[fileHash].isRegistered, "Receiptuary: Hash already registered");
        require(bytes(issuerName).length > 0, "Receiptuary: Issuer name cannot be empty");

        _receipts[fileHash] = Receipt({
            issuerName: issuerName,
            referenceId: referenceId,
            timestamp: block.timestamp,
            registeredBy: msg.sender,
            isRegistered: true
        });

        emit ReceiptRegistered(fileHash, issuerName, msg.sender);
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
