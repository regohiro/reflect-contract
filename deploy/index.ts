import { ethers } from "hardhat";
import { CatDoge } from './../typechain/CatDoge.d';
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
}

//Excute deploy
main()
  .then(verify)
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });