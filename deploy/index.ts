import { PreSale } from '../typechain/PreSale.d';
import { CatDoge } from '../typechain/CatDoge';
import { ethers } from "hardhat";
import { toBN, setDefaultSigner, deployer, deployToLiveNetwork, verify, toUnix, toWei } from '../utilities';

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

  //Set CatDoge Presale args
  const rate = (3 * 10 ** 9).toString();
  const wallet = ownerAddr;
  const token = cd.address;
  const openingTime = (toUnix("7/8/2021 9:45:00")).toString();
  const closingTime = (toUnix("7/8/2021 11:00:00")).toString();
  const caps = toBN(10);  //in BNB
  const minBuyLimit = toWei(0.01);   //in BNB 

  //Deploy CatDogePreSale
  const cdps = (await deployer("PreSale", rate, wallet, token, openingTime, closingTime, caps, minBuyLimit)) as PreSale;
}

//Excute deploy
main()
  .then(verify)
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });