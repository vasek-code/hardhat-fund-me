// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "contracts/PriceConverter.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

error FundMe__NotOwner();
error FundMe__NotEnoughFunds();
error FundMe__WithdrawCallFailed();

/**
 * @title A contract for crowd funding
 * @author Patrick Collins
 * @notice This contract is to demo a sample funding contracts
 * @dev This implements price feeds as our library
 */
contract FundMe {
    using PriceConverter for uint256;

    mapping(address => uint256) private s_addressToAmountFunded;
    address[] private s_funders;
    AggregatorV3Interface private s_priceFeed;

    address private immutable i_owner;
    uint256 public constant MINIMUM_USD = 50;

    modifier onlyOwner() {
        if (i_owner != msg.sender) {
            revert FundMe__NotOwner();
        }
        _;
    }

    constructor(address priceFeedAddress) {
        i_owner = msg.sender;

        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    /**
     * @notice This function funds this contract
     * @dev This implements price feeds as our library
     */
    function fund() public payable {
        if (msg.value.getConversionRate(s_priceFeed) / 1e18 < MINIMUM_USD) {
            revert FundMe__NotEnoughFunds();
        }

        s_funders.push(msg.sender);
        s_addressToAmountFunded[msg.sender] = msg.value;
    }

    function withdraw() public payable onlyOwner {
        for (
            uint256 funderIndex = 0;
            funderIndex < s_funders.length;
            funderIndex++
        ) {
            s_addressToAmountFunded[s_funders[funderIndex]] = 0;
        }

        s_funders = new address[](0);

        (bool sendSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");

        if (!sendSuccess) {
            revert FundMe__WithdrawCallFailed();
        }
    }

    function cheaperWithdraw() public payable onlyOwner {
        address[] memory funders = s_funders;

        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            s_addressToAmountFunded[funders[funderIndex]] = 0;
        }

        s_funders = new address[](0);

        (bool sendSuccess, ) = i_owner.call{value: address(this).balance}("");
        if (!sendSuccess) {
            revert FundMe__WithdrawCallFailed();
        }
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function getAddressToAmountFunded(
        address funder
    ) public view returns (uint256) {
        return s_addressToAmountFunded[funder];
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }
}
