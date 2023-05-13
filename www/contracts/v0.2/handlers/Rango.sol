// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import "../interfaces/IJobsQueue.sol";

contract Rango {
    enum ProcessStatus {SUCCESS, REFUND_IN_SOURCE, REFUND_IN_DESTINATION}
    address payable constant NULL_ADDRESS = payable(0x0000000000000000000000000000000000000000);
    IJobsQueue queue;

    constructor(address payable _coreContract) {
        queue = IJobsQueue(_coreContract);
    }

    function handleRangoMessage(
        address _token,
        uint _amount,
        ProcessStatus _status,
        bytes memory _message
    ) external {
        if (_status == ProcessStatus.SUCCESS) {// TODO : REFUND_IN_DESTINATION ?
            IJobsQueue.AppMessage memory m = abi.decode((_message), (IJobsQueue.AppMessage));
            uint256 value;

            if (_token == NULL_ADDRESS) {
                _amount = address(this).balance;
                value = _amount;
            } else {
                IERC20 asset = IERC20(_token);
                _amount = asset.balanceOf(address(this));
                value = 0;
                SafeERC20.safeTransfer(IERC20(_token), address(queue), _amount);
            }

            bytes memory payload = abi.encode(m.id, m.receiver, _token, m.dstAsset, m.dstChain, _amount, m.minAmount);

            queue.createJob{value : value}(payload);
        }
    }
}
