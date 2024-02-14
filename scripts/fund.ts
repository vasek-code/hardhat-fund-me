import { ethers, deployments, getNamedAccounts } from "hardhat";
import { FundMe } from "../typechain-types";

async function main() {
  await deployments.all();
  const { deployer } = await getNamedAccounts();

  const fundMeDeployment = await deployments.get("FundMe");
  const fundMe = (await ethers.getContractAt(
    "FundMe",
    fundMeDeployment.address
  )) as never as FundMe;

  console.log(`Got contract FundMe at ${await fundMe.getAddress()}`);
  console.log("Funding contract...");
  const transactionResponse = await fundMe.fund({
    value: ethers.parseEther("0.2"),
  });
  await transactionResponse.wait(1);

  console.log(
    `FundMe balance: ${await ethers.provider.getBalance(
      await fundMe.getAddress()
    )}`
  );
  console.log(
    `Deployer balance: ${await ethers.provider.getBalance(deployer)}`
  );
  console.log("Funded!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
