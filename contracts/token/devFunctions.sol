// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/*
* @Notice MockERC20 tokens are created for testing purposes only 
*/

contract MockERC20 is ERC20 {
  constructor(
    string memory _name,
    string memory _symbol, 
    address _to, 
    uint _amount
  ) ERC20(_name, _symbol) {
    _mint(_to, _amount);
  }
}