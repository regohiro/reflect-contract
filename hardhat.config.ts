import { task } from "hardhat/config";

import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
dotenvConfig({ path: resolve(__dirname, "./.env") });

import { HardhatUserConfig, NetworkUserConfig } from "hardhat/types";
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';

import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-etherscan";

const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
  bsctestnet: 97,
  bscmainnet: 56
};

var blockchain = "bsc";

const MNEMONIC = process.env.MNEMONIC || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";
const MORALIS_API_KEY = process.env.MORALIS_API_KEY || "";


task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});


function createTestnetConfig(network: keyof typeof chainIds): NetworkUserConfig {
  let url: string;

  if(network == "bsctestnet" || network == "bscmainnet"){
    blockchain = "bsc";
    url = "https://" + "speedy-nodes-nyc.moralis.io/" + MORALIS_API_KEY + "/bsc/" + network.substr(3);
  }else{
    blockchain = "eth";
    url = "https://" + "speedy-nodes-nyc.moralis.io/" + MORALIS_API_KEY + "/eth/" + network;
  }

  return {
    accounts: {
      count: 10,
      initialIndex: 0,
      mnemonic: MNEMONIC,
      path: "m/44'/60'/0'/0",
    },
    chainId: chainIds[network],
    url,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.4.18",
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.4",
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
    mainnet: createTestnetConfig("mainnet"),
    goerli: createTestnetConfig("goerli"),
    kovan: createTestnetConfig("kovan"),
    rinkeby: createTestnetConfig("rinkeby"),
    ropsten: createTestnetConfig("ropsten"),
    bsctestnet: createTestnetConfig("bsctestnet"),
    bscmainnet: createTestnetConfig("bscmainnet"),
  },
  etherscan: {
    apiKey: blockchain == "bsc" ? BSCSCAN_API_KEY : ETHERSCAN_API_KEY,
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 100,
    enabled: process.env.REPORT_GAS ? true : false,
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
