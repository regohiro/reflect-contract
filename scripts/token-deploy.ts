import { ethers, waffle } from "hardhat";
import { verify, deployToLiveNetwork, setDefaultSigner, deployer } from '../utils';
 
async function main() {
  //When called, it will print receipt and verify to BscScan
  deployToLiveNetwork();

  //Set contract signer (owner)
  const signers = await ethers.getSigners();
  const owner = signers[0];
  setDefaultSigner(owner);

  //Set Token contract args
  const name = "DontApeThis";
  const symbol = "DAT";
  const totalSupply = (10**10).toString(); //NO DECIMAL
  const decimals = "18";
  const reflectionFee = "15";
  const swapFee = "135";

  //Deploy DAT Token
  await deployer("Token", name, symbol, totalSupply, decimals, reflectionFee, swapFee);
}

//Excute deploy
main()
  .then(verify)
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });