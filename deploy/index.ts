import { CatDogePreSale } from './../typechain/CatDogePreSale.d';
import { CatDoge } from '../typechain/CatDoge';
import { ethers } from "hardhat";
import { toBN, setDefaultSigner, deployer, deployToLiveNetwork, verify } from '../utilities';

/*
* About: deployer() function
* @param contractName Name of the contract to deploy
* @param [] Arguments of contract constructor
* @return contract Instance of contract (but not typed!)
*/

async function main() {
  //When called, it will print receipt and verify to Etherscan
  deployToLiveNetwork();

  //Set contract signer (owner)
  const signers = await ethers.getSigners();
  const owner = signers[0];
  const ownerAddr = await owner.getAddress();
  setDefaultSigner(owner);
  
  //Deploy CatDoge
  const cd = (await deployer("CatDoge")) as CatDoge;

  //Set CatDoge args
  const rate = (3 * 10 ** 9).toString();
  const wallet = ownerAddr;
  const token = await cd.address;
  const openingTime = (1625639400).toString();
  const closingTime = (1625641200).toString();
  const caps = toBN(10);

  //Deploy CatDogePreSale
  const cdps = (await deployer("CatDogePreSale", rate, wallet, token, openingTime, closingTime, caps)) as CatDogePreSale;
}

//Excute deploy
main()
  .then(verify)
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });