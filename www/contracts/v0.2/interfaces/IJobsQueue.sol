pragma solidity ^0.8.17;

interface IJobsQueue {

    struct AppMessage {
        bytes16 id;
        address receiver;
        address inputAsset;
        address dstAsset;
        uint256 dstChain;
        uint256 minAmount;
    }

    function createJob(bytes calldata _data) external payable;
}