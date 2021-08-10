// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// import "hardhat/console.sol";

contract Presale is Context, Ownable, ReentrancyGuard {
  using SafeERC20 for IERC20;

  // Instance of token to sell (DAT)
  IERC20 public token;

  // Wallet where funds will be collected after withdraw
  address public wallet;

  // 1BNB = [rate] DAT without discount
  uint256 public rate;

  // Presale time in UNIX
  uint256 public openingTime;
  uint256 public closingTime;

  uint256 public minBuyLimit; //0.5 * 10**18 weiBNB
  uint256 public maxDiscount; // 3 * 10**18 weiBNB
  uint256 public maxBounsPercentage; //25%

  event TokensPurchased(address indexed purchaser, uint256 value, uint256 amount);

  constructor(
    IERC20 _token,
    address _wallet,
    uint256 _rate,
    uint256 _openingTime,
    uint256 _closingTime,
    uint256 _minBuyLimit,
    uint256 _maxDiscount,
    uint256 _maxBounsPercentage
  ) {
    require(_rate > 0, "Presale: rate is 0");
    require(_openingTime >= block.timestamp, "Presale: Invalid opening time");
    require(_closingTime >= _openingTime, "Presale: closing time < opening time");

    token = _token;
    wallet = _wallet;
    rate = _rate;
    openingTime = _openingTime;
    closingTime = _closingTime;
    minBuyLimit = _minBuyLimit;
    maxDiscount = _maxDiscount;
    maxBounsPercentage = _maxBounsPercentage;
  }

  function hasClosed() public view returns (bool) {
    return block.timestamp > closingTime;
  }

  function isOpen() public view returns (bool) {
    return block.timestamp >= openingTime && block.timestamp <= closingTime;
  }

  function getTime() external view returns (uint256) {
    return block.timestamp;
  }

  function buyTokens() external payable nonReentrant {
    uint256 weiAmount = msg.value;
    address purchaser = _msgSender();

    //Calculate token amount to transfer
    uint256 tokens = getTokenAmoount(weiAmount);

    //Checks
    _preValidatePurchase(weiAmount);

    //Interactions
    token.safeTransfer(purchaser, tokens);
    emit TokensPurchased(purchaser, weiAmount, tokens);
  }

  function _preValidatePurchase(uint256 weiAmount) internal view {
    require(block.timestamp >= openingTime && block.timestamp <= closingTime, "Presale has not started yet");
    require(minBuyLimit <= weiAmount, "Presale: need to buy more");
  }

  function getTokenAmoount(uint256 _weiAmount) public view returns (uint256) {
    uint256 baseTokenAmount = _weiAmount * rate;
    uint256 timeLeft = closingTime - block.timestamp;
    uint256 spentAmount = _weiAmount > maxDiscount ? maxDiscount : _weiAmount;
    uint256 maxTimeLeft = closingTime - openingTime;
    uint256 bounsTokenAmount = ((timeLeft * spentAmount) * baseTokenAmount * maxBounsPercentage) /
      ((maxTimeLeft * maxDiscount) * 100);

    return baseTokenAmount + bounsTokenAmount;
  }

  function withdrawFunds() external onlyOwner {
    require(hasClosed(), "Presale: Cannot withdraw until presale is over");
    (bool success, ) = payable(wallet).call{ value: address(this).balance }("");
    require(success, "Presale: Failed to forward funds");
  }

  function withdrawRemainingTokens() external onlyOwner {
    require(hasClosed(), "Presale: Cannot withdraw until presale is over");
    uint256 amount = token.balanceOf(address(this));
    require(amount > 0, "Presale: amount is 0");
    token.transfer(wallet, amount);
  }

  function updateWallet(address _wallet) external onlyOwner {
    wallet = _wallet;
  }

  function setRate(uint256 _rate) external onlyOwner {
    rate = _rate;
  }

  function setPresaleTime(uint256 _openingTime, uint256 _closingTime) external onlyOwner {
    require(_openingTime >= block.timestamp, "Presale: Invalid opening time");
    require(_closingTime >= _openingTime, "Presale: closing time < opening time");
    openingTime = _openingTime;
    closingTime = _closingTime;
  }

  function setLimits(
    uint256 _minBuyLimit,
    uint256 _maxDiscount,
    uint256 _maxBounsPercentage
  ) external onlyOwner {
    minBuyLimit = _minBuyLimit;
    maxDiscount = _maxDiscount;
    maxBounsPercentage = _maxBounsPercentage;
  }
}