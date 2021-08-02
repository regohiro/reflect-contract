import { UnPresale } from './../typechain/UnPresale.d';
import { ethers } from "hardhat";
import { setDefaultSigner, deployer, deployToLiveNetwork, verify } from '../utilities';

async function main() {
  //When called, it will print receipt and verify to BscScan
  deployToLiveNetwork();

  //Set contract signer (owner)
  const signers = await ethers.getSigners();
  const owner = signers[0];
  setDefaultSigner(owner);
  
  //Set Presale contract args
  const rate = (56000000000).toString(); //1BNB = ? tokens (NO DECIMAL)
  const wallet = "0xaebeC1d7309a3C6d7740662408e28A9b693AeA2E";
  const token = "0x7aFB9E961304B732a54122Bec5D5770ccacE1516";

  //Deploy Presale Contract
  const cdps = await deployer("UnPresale", rate, wallet, token,) as UnPresale;
}

//Excute deploy
main()
  .then(verify)
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });