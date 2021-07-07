## Usage To the moon

### Pre Requisites

Before running any command, make sure to install dependencies:

```sh
$ yarn install
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### Test

Run the Mocha tests:

```sh
$ yarn test
```

### Deploy contract to a live network (requires Mnemonic and Moralis API key) + validate to etherscan

```
npx hardhat run <migration file> --network <network> 
```

Example:

```
npx hardhat run ./deploy/index.ts --network rinkeby 
```

### Validate a contract with etherscan (requires API key)

Notice: Contract is validated automatically in the deployment process. 

```
npx hardhat verify --network <network> <DEPLOYED_CONTRACT_ADDRESS> "Constructor argument 1"
```

Example:

```
npx hardhat verify --network rinkeby 0x123..56 --constructor-args arguments.js
```

### Interacting with Hardhat console (rinkeby example)

Connect to rinkeby network:

```
npx hardhat console --network rinkeby
```

List accounts (uses Mnemonic to generate account):

```sh
> const accounts = await ethers.provider.listAccounts();
> accounts[0]
'0x374.....570'
```

Get instance of deployed contract:

```sh
> const Box = await ethers.getContractFactory("Box");
> const box = await Box.attach("0x7e25FaDC15EBc59c7b4EFEd313A95A2955bA73E2");
> await box.address
'0x7e25FaDC15EBc59c7b4EFEd313A95A2955bA73E2'
```

### Interacting with live network programmatically (rinkeby example)

```
npx hardhat run ./scripts/index.ts --network rinkeby
```