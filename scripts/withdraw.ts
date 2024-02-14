import { ethers, deployments, getNamedAccounts } from "hardhat";
import { FundMe } from "../typechain-types";

async function main() {
  await deployments.all();
  const { deployer: deployerAddress } = await getNamedAccounts();
  const deployer = await ethers.getSigner(deployerAddress);

  const fundMeDeployment = await deployments.get("FundMe");
  const fundMe = (await ethers.getContractAt(
    "FundMe",
    fundMeDeployment.address
  )) as never as FundMe;

  console.log(`Got contract FundMe at ${await fundMe.getAddress()}`);
  console.log("Withdrawing contract...");
  const transactionResponse = await fundMe.cheaperWithdraw();
  await transactionResponse.wait(1);

  console.log(
    `FundMe balance: ${await ethers.provider.getBalance(
      await fundMe.getAddress()
    )}`
  );
  console.log(
    `Deployer balance: ${await ethers.provider.getBalance(deployer)}`
  );
  console.log("Withdrawed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
