import { ethers, waffle } from "hardhat";
import { Presale } from './../typechain/Presale.d';
import { Token } from './../typechain/Token.d';
import { toBN, getContractInstance } from '../utilities';
 
async function main() {
  //List accounts
  const accounts = await ethers.provider.listAccounts(); //returns addresses
  const owner = accounts[0];
  
  /* Get contract instance, there is no need to put contract address as long as you deployed the contract with printLog enabled AND if you are accessing the contract you just deployed recently. */
  const cd = await getContractInstance("CatDoge") as Token;

  console.log(`Decimals: ${await cd.decimals()}`);
}

//Excute deploy
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });