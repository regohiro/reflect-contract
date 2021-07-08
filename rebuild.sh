#!/usr/bin/env bash

#Clean build files
rm -rf artifacts
rm -rf cache
rm -rf typechain

#Rebuild
yarn compile