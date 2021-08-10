
import { ethers } from "hardhat";
import { setDefaultSigner, deployer, deployToLiveNetwork, verify, toUnix, toWei } from '../utils';

async function main() {
  //When called, it will print receipt and verify to BscScan
  deployToLiveNetwork();

  //Set contract signer (owner)
  const signers = await ethers.getSigners();
  const owner = signers[0];
  setDefaultSigner(owner);
  
  //Set Presale contract args
  const token = "0x7aFB9E961304B732a54122Bec5D5770ccacE1516";
  const wallet = "0xb801C377f7578331A8f4EF5cFD48757146a6CF50";
  const rate = "1000" //1BNB = ? tokens (NO DECIMAL)
  const openingTime = (toUnix("2021-07-30T12:00:00.000Z")).toString();
  const closingTime = (toUnix("2021-08-02T12:00:00.000Z")).toString();
  const minBuyLimit = toWei(0.1); //0.1 BNB
  const maxDiscount = toWei(3); //3 BNB
  const maxBounsPercentage = "25";

  //Deploy Presale Contract
  await deployer("Presale", token, wallet, rate, openingTime, closingTime, minBuyLimit, maxDiscount, maxBounsPercentage);
}

//Excute deploy
main()
  .then(verify)
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });