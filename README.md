## Usage

### Pre Requisites

Before running any command, make sure to install dependencies:

```sh
$ yarn 
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### Deploy contract to a live network + validate to bscscan

Note: requires mnemonic and Moralis API key

```
npx hardhat run deploy --network bsctestnet
```

### Rebuild contracts

Note: May need to give permession

```sh
./rebuild.sh
```