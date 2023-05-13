// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './libraries/LibBytes.sol';
import "./interfaces/IJobsQueue.sol";

contract JobsQueue is Ownable, IJobsQueue {
    address public immutable gelatoProxy;
    address constant NATIVE = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    mapping(address => bool) origins;
    mapping(bytes32 => uint256) jobsPosition; // jobId -> job array position
    mapping(bytes16 => bool) usedJobIds; // whether a jobId is in use already
    Job[] private jobs;

    error UnauthorizedOrigin();
    error UnauthorizedExecutor();
    error JobWithZeroAmount();
    error JobWithNoReceiver();
    error JobIdInUse();

    event Success(bytes16 indexed id, bytes17 providerInfo);
    event Fail(bytes16 indexed id, string msg);

    struct HandlerMessage {
        bytes16 id;
        address receiver;
        address inputAsset;
        address dstAsset;
        uint256 dstChain;
        uint256 amountIn;
        uint256 minAmountOut;
    }

    struct Job {
        bytes16 id;
        address receiver;
        address inputAsset;
        address dstAsset;
        uint256 dstChain;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 position;
    }

    struct ExecuteJob {
        bytes16 id;
        address sender;
        address receiver;
        address inputAsset;
        address dstAsset;
        uint256 srcChain;
        uint256 dstChain;
        uint256 amountIn;
        uint256 minAmountOut;
    }

    struct ExecuteCall {
        bytes16 jobId;
        bytes17 providerInfo;
        address handler;
        bytes data;
    }

    struct TxInfo {
        uint256 amountIn;
        address srcAsset;
        address dstAsset;
        address handler;
        bytes data;
    }

    constructor(address _ops) {
        gelatoProxy = _ops;
    }

    modifier onlyGelato() {
        if (msg.sender != gelatoProxy) {
            revert UnauthorizedExecutor();
        }
        _;
    }

    /**
     * executes the some of the given jobs
     * @dev this is executed by Gelato Network
     */
    function executeJobs(ExecuteCall[] calldata calls) external onlyGelato {
        ExecuteCall memory currentCall;
        Job storage job;
        uint256 valueToSend;
        uint256 callsLength = calls.length;

        for (uint i = 0; i < callsLength; i++) {
            // unwrap job
            currentCall = calls[i];
            job = jobs[jobsPosition[currentCall.jobId]];

            // check job is still remaining
            if (usedJobIds[job.id]) {
                // decide value and token approval
                if (job.inputAsset == NATIVE) {
                    valueToSend = job.amountIn;
                } else {
                    valueToSend = 0;
                    SafeERC20.safeApprove(IERC20(job.inputAsset), currentCall.handler, job.amountIn);
                }

                // execute
                (bool success, bytes memory response) = currentCall.handler.call{value : valueToSend}(currentCall.data);

                delete jobs[job.position];
                delete jobsPosition[job.id];
                delete usedJobIds[job.id];

                if (success) {
                    emit Success(job.id, currentCall.providerInfo);
                }
                else {
                    if (job.inputAsset == NATIVE) {
                        payable(job.receiver).transfer(job.amountIn);
                    } else {
                        SafeERC20.safeTransfer(IERC20(job.inputAsset), job.receiver, job.amountIn);
                    }
                    emit Fail(job.id, LibBytes.getRevertMsg(response));
                }
            }
        }
    }

    /**
     * called by users to start a swidge
     */
    function start(TxInfo[] calldata calls) external payable {
        TxInfo memory currentTx = calls[0];
        uint256 valueToSend;
        uint256 amountToTrade;
        uint256 callsLength = calls.length;
        uint256 boughtAmount;

        // transfer from user if necessary
        if (currentTx.srcAsset != NATIVE) {
            SafeERC20.safeTransferFrom(IERC20(currentTx.srcAsset), msg.sender, address(this), currentTx.amountIn);
        }

        // set initial amount
        amountToTrade = currentTx.amountIn;

        // iterate to execute all trades
        for (uint i = 0; i < callsLength;) {
            currentTx = calls[i];

            // check is there's an excess
            if (amountToTrade > currentTx.amountIn) {

            }

            // check value and approval
            if (currentTx.srcAsset == NATIVE) {
                valueToSend = amountToTrade;
            } else {
                valueToSend = 0;
                SafeERC20.safeApprove(IERC20(currentTx.srcAsset), currentTx.handler, amountToTrade);
            }

            // initial amount of destination asset
            boughtAmount = getBalance(currentTx.dstAsset);

            // execute
            (bool success, bytes memory response) = currentTx.handler.call{value : valueToSend}(currentTx.data);

            // compute amount for next trade
            amountToTrade = getBalance(currentTx.dstAsset) - boughtAmount;

        unchecked {
            ++i;
        }
        }
    }

    /**
     * queues a new job into the list
     * @dev this is called by our deployed handlers
     */
    function createJob(bytes calldata _data) external payable {
        if (!origins[msg.sender]) revert UnauthorizedOrigin();

        HandlerMessage memory handlerMsg = abi.decode(_data, (HandlerMessage));

        if (usedJobIds[handlerMsg.id]) revert JobIdInUse();
        if (handlerMsg.receiver == address(0)) revert JobWithNoReceiver();
        if (handlerMsg.amountIn == 0) revert JobWithZeroAmount();

        uint256 currentLength = jobs.length;
        uint256 emptySlot = _getEmptySlot(currentLength);

        Job memory job = Job(
            handlerMsg.id,
            handlerMsg.receiver,
            handlerMsg.inputAsset,
            handlerMsg.dstAsset,
            handlerMsg.dstChain,
            handlerMsg.amountIn,
            handlerMsg.minAmountOut,
            emptySlot
        );

        if (emptySlot == currentLength) {
            jobs.push(job);
        }
        else {
            jobs[emptySlot] = job;
        }
        jobsPosition[job.id] = emptySlot;
        usedJobIds[job.id] = true;
    }

    /**
     * returns the next usable slot on the jobs array
     */
    function _getEmptySlot(uint256 currentLength) internal view returns (uint256) {
        Job storage job;
        for (uint i = 0; i < currentLength; i++) {
            job = jobs[i];
            if (!usedJobIds[job.id]) {
                return i;
            }
        }
        return currentLength;
    }

    /**
     * updates the allowed addresses to create jobs
     */
    function updateOrigins(address[] calldata _origins) external onlyOwner {
        for (uint i = 0; i < _origins.length; i++) {
            origins[_origins[i]] = true;
        }
    }

    /**
     * returns a list of pending jobs
     * @dev this function is only called from off-chain actor
     * @dev so we can afford to be a bit inefficient to get the list
     */
    function getPendingJobs() external view returns (ExecuteJob[] memory) {
        // compute array size
        uint total = 0;
        for (uint i = 0; i < jobs.length; i++) {
            Job storage job = jobs[i];
            if (usedJobIds[job.id]) {
                ++total;
            }
        }
        ExecuteJob[] memory returnJobs = new ExecuteJob[](total);
        // fill array
        total = 0;
        for (uint i = 0; i < jobs.length; i++) {
            Job storage job = jobs[i];
            if (usedJobIds[job.id]) {
                returnJobs[total] = ExecuteJob(
                    job.id,
                    address(this),
                    job.receiver,
                    job.inputAsset,
                    job.dstAsset,
                    block.chainid,
                    job.dstChain,
                    job.amountIn,
                    job.minAmountOut
                );
                ++total;
            }
        }
        return returnJobs;
    }

    /**
     * returns the current balance of an asset
     */
    function getBalance(address asset) internal returns (uint256){
        if (asset == NATIVE) {
            return address(this).balance;
        }
        else {
            return IERC20(asset).balanceOf(address(this));
        }
    }
}
