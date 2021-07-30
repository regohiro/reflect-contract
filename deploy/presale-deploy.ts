import { Presale } from './../typechain/Presale.d';
import { ethers } from "hardhat";
import { setDefaultSigner, deployer, deployToLiveNetwork, verify, toUnix, toWei } from '../utilities';

async function main() {
  //When called, it will print receipt and verify to BscScan
  deployToLiveNetwork();

  //Set contract signer (owner)
  const signers = await ethers.getSigners();
  const owner = signers[0];
  setDefaultSigner(owner);
  
  //Set Presale contract args
  const rate = (56000000000).toString(); //1BNB = ? tokens (NO DECIMAL)
  const wallet = "0xb801C377f7578331A8f4EF5cFD48757146a6CF50";
  const token = "0x7aFB9E961304B732a54122Bec5D5770ccacE1516";
  const openingTime = (toUnix("7/31/2021 00:30:00")).toString();
  const closingTime = (toUnix("8/1/2021 2:30:00")).toString();
  const caps = toWei(20);  //in BNB
  const minBuyLimit = toWei(0.01);   //in BNB 

  //Deploy Presale Contract
  const cdps = (await deployer("Presale", rate, wallet, token, openingTime, closingTime, caps, minBuyLimit)) as Presale;
}

//Excute deploy
main()
  .then(verify)
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });