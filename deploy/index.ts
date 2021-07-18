import { Presale } from './../typechain/Presale.d';
import { Token } from './../typechain/Token.d';
import { ethers } from "hardhat";
import { toBN, setDefaultSigner, deployer, deployToLiveNetwork, verify, toUnix, toWei } from '../utilities';

async function main() {
  //When called, it will print receipt and verify to BscScan
  deployToLiveNetwork();

  //Set contract signer (owner)
  const signers = await ethers.getSigners();
  const owner = signers[0];
  const ownerAddr = await owner.getAddress();
  setDefaultSigner(owner);

  //Set Token contract args
  const name = "DontApeThis";
  const symbol = "DAT";
  const totalSupply = (10**15).toString(); //NO DECIMAL
  const decimals = "3";
  const reflectionFee = "15";
  const swapFee = "135";

  //Deploy CatDoge (token)
  const cd = await deployer("Token", name, symbol, totalSupply, decimals, reflectionFee, swapFee) as Token;

  //Set Presale contract args
  const rate = (3 * 10 ** 9).toString(); //1BNB = ? tokens (NO DECIMAL)
  const wallet = ownerAddr;
  const token = cd.address;
  const openingTime = (toUnix("7/23/2021 20:25:00")).toString();
  const closingTime = (toUnix("7/25/2021 21:00:00")).toString();
  const caps = toBN(10);  //in BNB
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