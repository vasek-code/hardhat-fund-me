import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { FundMe } from "../../typechain-types";
import { developmentChains } from "../../helper-hardhat-config";
import { assert } from "chai";

if (developmentChains.includes(network.name)) {
  describe.skip("FundMe", () => {});
} else {
  describe("FundMe", function () {
    let fundMe: FundMe;
    let deployer: string;
    const sendValue = ethers.parseEther("0.26");

    before(async function () {
      // Perform all asynchronous setup here
      try {
        await deployments.all();
        deployer = (await getNamedAccounts()).deployer;
        const fundMeDeployment = await deployments.get("FundMe");
        fundMe = (await ethers.getContractAt(
          "FundMe",
          fundMeDeployment.address
        )) as never as FundMe;
      } catch (e) {
        console.error(e);
      }
    });

    it("allows deployer to fund and withdraw", async function () {
      await fundMe.fund({ value: sendValue });
      await fundMe.cheaperWithdraw();
      const fundMeFunds = await ethers.provider.getBalance(
        await fundMe.getAddress()
      );
      assert.equal(fundMeFunds.toString(), "0");
    });
  });
}
