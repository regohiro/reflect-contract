// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.4;

import "./TimedCrowdsale.sol";
 
contract CatDogePreSale is TimedCrowdsale {

  mapping(address => uint256) public contributions;
  uint256 public caps;

  constructor(
    uint256 _rate,
    address _wallet,
    IERC20 _token, 
    uint256 _openingTime, 
    uint256 _closingTime,
    uint256 _caps) TimedCrowdsale(_rate, _wallet, _token, _openingTime, _closingTime) {
    caps = _caps;
  }

  /**
   * @dev Returns the amount contributed so far by a sepecific user.
   * @param _beneficiary Address of contributor
   * @return User contribution so far
   */
  function getUserContribution(address _beneficiary) public view returns (uint256) {
    return contributions[_beneficiary];
  }

  /**
   * @dev Extend parent behavior requiring purchase to respect the user's funding cap.
   * @param _beneficiary Token purchaser
   * @param _weiAmount Amount of wei contributed
   */
  function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) override internal {
    super._preValidatePurchase(_beneficiary, _weiAmount);
    require(contributions[_beneficiary] + _weiAmount <= caps);
  }

  /**
   * @dev Extend parent behavior to update user contributions
   * @param _beneficiary Token purchaser
   * @param _weiAmount Amount of wei contributed
   */
  function _updatePurchasingState(address _beneficiary, uint256 _weiAmount) override internal {
    super._updatePurchasingState(_beneficiary, _weiAmount);
    contributions[_beneficiary] += _weiAmount;
  }

  function withdrawFunds(uint256 _amount) external onlyOwner {
    //Checks
    require(hasClosed(), "Crowdsale: Cannot withdraw until presale is over");
    require(_amount <= address(this).balance, "Crowdsale: Insufficient balance");
    //Interactions
    (bool success, ) = payable(wallet).call{ value: _amount }("");
    require(success, "Crowdsale: Forward funds failed");
  }

  function withdrawRemainingTokens() external onlyOwner {
    require(hasClosed(), "Crowdsale: Cannot withdraw until presale is over");
    uint256 amount = token.balanceOf(address(this));
    require(amount > 0, "Crowdsale: amount is 0");
    token.transfer(wallet, amount);
  }
}
