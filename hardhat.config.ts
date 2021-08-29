import { task } from "hardhat/config";

import { HardhatUserConfig, NetworkUserConfig } from "hardhat/types";
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';

import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-etherscan";

import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
dotenvConfig({ path: resolve(__dirname, "./.env") });

const chainIds = {
  hardhat: 31337,
  bsctestnet: 97,
  bscmainnet: 56,
};

const MNEMONIC = process.env.MNEMONIC || "";
const MNEMONIC_MAINNET = process.env.MNEMONIC_MAINNET || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";
const MORALIS_API_KEY = process.env.MORALIS_API_KEY || "";

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
});

function createNetworkConfig(network: keyof typeof chainIds): NetworkUserConfig {
  let _mnemonic: string;

  if(network == "bscmainnet"){
    _mnemonic = MNEMONIC_MAINNET;
  }else{
    _mnemonic = MNEMONIC;
  }

  return {
    accounts: {
      count: 10,
      initialIndex: 0,
      mnemonic: _mnemonic,
      path: "m/44'/60'/0'/0",
    },
    chainId: chainIds[network],
    url: "https://" + "speedy-nodes-nyc.moralis.io/" + MORALIS_API_KEY + "/bsc/" + network.substr(3)
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: chainIds.hardhat,
      forking: {
        url: "https://" + "speedy-nodes-nyc.moralis.io/" + MORALIS_API_KEY + "/bsc/mainnet"
      },
    },
    bsctestnet: createNetworkConfig("bsctestnet"),
    bscmainnet: createNetworkConfig("bscmainnet"),
  },
  etherscan: {
    apiKey: BSCSCAN_API_KEY
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 100,
    enabled: false,
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  mocha: {
    timeout: 20000000
  }
};

export default config;
