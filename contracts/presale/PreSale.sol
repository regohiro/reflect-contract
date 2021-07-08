// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "hardhat/console.sol";

contract PreSale is Context, Ownable{
  using SafeERC20 for IERC20; 

  // CatDoge Token
  IERC20 public token;

  // Address where funds are collected
  address public wallet;

  // 1BNB = [rate] tokens 
  uint256 public rate;

  // Amount of wei raised
  uint256 public weiRaised;

  // Presale time in UNIX
  uint256 public openingTime;
  uint256 public closingTime;

  // Contributions
  mapping(address => uint256) public contributions;
  uint256 public caps;
  uint256 public minBuyLimit;

  event TokensPurchased(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);


  modifier onlyWhileOpen {
    require(block.timestamp >= openingTime && block.timestamp <= closingTime, "Crowdsale: Presale has not started yet");
    _;
  }


  constructor(
    uint256 _rate,
    address _wallet,
    IERC20 _token, 
    uint256 _openingTime, 
    uint256 _closingTime,
    uint256 _caps,
    uint256 _minBuyLimit) {

    require(_rate > 0, "Crowdsale: rate is 0");
    require(_wallet != address(0), "Crowdsale: wallet is the zero address");
    require(address(_token) != address(0), "Crowdsale: token is the zero address");
    require(_openingTime >= block.timestamp, "Crowdsale: Invalid opening time");
    require(_closingTime >= _openingTime, "Crowdsale: closing time < opening time");

    caps = _caps;
    rate = _rate;
    wallet = _wallet;
    token = _token;
    openingTime = _openingTime;
    closingTime = _closingTime;
    minBuyLimit = _minBuyLimit;
  }

  /**
   * @return Whether crowdsale period has elapsed
   */
  function hasClosed() public view returns (bool) {
    return block.timestamp > closingTime;
  }

  /**
   * @return Whether crowdsale is open
   */
  function isOpen() public view returns (bool) {
    return block.timestamp >= openingTime && block.timestamp <= closingTime;
  }

  function buyTokens() external payable {
    address beneficiary = msg.sender; 
    uint256 weiAmount = msg.value;

    // calculate token amount to transfer
    uint256 tokens = (weiAmount * rate) * 10**3 / 10**18;

    //Checks
    _preValidatePurchase(beneficiary, weiAmount);

    //Effects
    weiRaised += weiAmount;
    contributions[beneficiary] += weiAmount;

    //Interactions
    token.transfer(beneficiary, tokens);
    emit TokensPurchased(_msgSender(), beneficiary, weiAmount, tokens);
  }

  /**
   * @param beneficiary Address performing the token purchase
   * @param weiAmount Value in wei involved in the purchase
   */
  function _preValidatePurchase(
    address beneficiary,
    uint256 weiAmount
  ) internal view onlyWhileOpen{
    require(beneficiary != address(0), "Crowdsale: beneficiary is the zero address");
    require(weiAmount != 0, "Crowdsale: weiAmount is 0");
    require(minBuyLimit <= weiAmount, "Crowdsale: need to buy more");
    require(contributions[beneficiary] + weiAmount <= caps, "Crowdsale: exceeded cap!");
  }

  function setCap(uint256 _amount) external onlyOwner {
    caps = _amount;
  }

  function setMinBuyLimit(uint256 _amount) external onlyOwner {
    minBuyLimit = _amount;
  }

  function withdrawFunds() external onlyOwner {
    require(hasClosed(), "Crowdsale: Cannot withdraw until presale is over");
    (bool success, ) = payable(wallet).call{ value: address(this).balance }("");
    require(success, "Crowdsale: Forward funds failed");
  }

  function withdrawRemainingTokens() external onlyOwner {
    require(hasClosed(), "Crowdsale: Cannot withdraw until presale is over");
    uint256 amount = token.balanceOf(address(this));
    require(amount > 0, "Crowdsale: amount is 0");
    token.transfer(wallet, amount);
  }
}