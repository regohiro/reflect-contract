import { ethers, waffle } from "hardhat";
import { CatDoge } from './../typechain/CatDoge.d';
import { toBN, getContractInstance } from '../utilities';

async function main() {
  //List accounts
  const accounts = await ethers.provider.listAccounts(); //returns addresses
  const owner = accounts[0];
  
  /* Get contract instance, no need to put contract address as long as you deployed the contract with printLog enabled AND if you are accessing the contract you just deployed recently. */
  const cd = await getContractInstance("CatDoge") as CatDoge;

  console.log(`Decimals: ${await cd.decimals()}`);
}

//Excute deploy
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });