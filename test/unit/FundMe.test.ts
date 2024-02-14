import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { FundMe, MockV3Aggregator } from "../../typechain-types";
import { assert, expect } from "chai";
import { developmentChains } from "../../helper-hardhat-config";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async function () {
      const sendValue = ethers.parseEther("1");

      let fundMe: FundMe;
      let mockV3Aggregator: MockV3Aggregator;

      let deployer: string;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;

        // deploys all contracts
        const {
          FundMe: fundMeAddress,
          MockV3Aggregator: mockV3AggregatorAddress,
        } = await deployments.fixture(["all"]);

        fundMe = (await ethers.getContractAt(
          "FundMe",
          fundMeAddress.address
        )) as never as FundMe;

        mockV3Aggregator = (await ethers.getContractAt(
          "MockV3Aggregator",
          mockV3AggregatorAddress.address
        )) as never as MockV3Aggregator;
      });

      describe("constructor", async function () {
        it("sets the aggregator addresses correctly", async function () {
          const mockV3AggregatorAddress = await mockV3Aggregator.getAddress();
          const fundMePriceFeed = await fundMe.getPriceFeed();

          assert.equal(fundMePriceFeed, mockV3AggregatorAddress);
        });
      });

      describe("fund", async function () {
        it("Reverts because of not enough funds were sent", async function () {
          await expect(fundMe.fund()).to.be.revertedWithCustomError(
            fundMe,
            "FundMe__NotEnoughFunds"
          );
        });

        it("Updates map with value sent and sender", async function () {
          await fundMe.fund({ value: sendValue });

          const response = await fundMe.getAddressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });

        it("Adds funder to array of funders", async function () {
          await fundMe.fund({ value: sendValue });

          const funder = await fundMe.getFunder(0);
          assert.equal(funder, deployer);
        });
      });

      describe("withdraw", async function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
        });

        it("Withdraw ETH from a deployer address", async function () {
          const startingContractBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const startingFunderBalance = await ethers.provider.getBalance(
            deployer
          );

          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          const finalContractBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const finalFunderBalance = await ethers.provider.getBalance(deployer);

          if (!transactionReceipt?.gasUsed)
            throw new Error("No gas used on the contract");

          const gasCost =
            transactionReceipt.gasUsed * transactionReceipt.gasPrice;

          assert.equal(
            finalFunderBalance + gasCost,
            startingContractBalance + startingFunderBalance
          );
          assert.equal(finalContractBalance.toString(), "0");

          await expect(fundMe.getFunder(0)).to.be.reverted;
        });

        it("Cheaper Withdraw ETH from a deployer address", async function () {
          const startingContractBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const startingFunderBalance = await ethers.provider.getBalance(
            deployer
          );

          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          const finalContractBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const finalFunderBalance = await ethers.provider.getBalance(deployer);

          if (!transactionReceipt?.gasUsed)
            throw new Error("No gas used on the contract");

          const gasCost =
            transactionReceipt.gasUsed * transactionReceipt.gasPrice;

          assert.equal(
            finalFunderBalance + gasCost,
            startingContractBalance + startingFunderBalance
          );
          assert.equal(finalContractBalance.toString(), "0");

          await expect(fundMe.getFunder(0)).to.be.reverted;
        });

        it("allows deployer to withdraw and others not to", async function () {
          const accounts = await ethers.getSigners();

          const deployerAccount = accounts[0];
          const attackerAccount = accounts[1];

          await expect(
            fundMe.connect(attackerAccount).withdraw()
          ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");

          await expect(
            fundMe.connect(deployerAccount).withdraw()
          ).to.not.revertedWithCustomError(fundMe, "FundMe__NotOwner");

          // Checking if funders[] is reset after withdrawing
          await expect(fundMe.getFunder(0)).to.be.reverted;
        });

        it("is allows us to withdraw with multiple funders cheaper", async function () {
          // Arrange
          const accounts = await ethers.getSigners();

          for (const account of accounts) {
            await fundMe.connect(account).fund({ value: sendValue });
          }

          // Act
          const startingFundMeBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait();

          if (!transactionReceipt) throw new Error("No transaction receipt");

          const { gasUsed, gasPrice } = transactionReceipt;
          const withdrawGasCost = gasUsed * gasPrice;

          console.log(`GasCost: ${withdrawGasCost}`);
          console.log(`GasUsed: ${gasUsed}`);
          console.log(`GasPrice: ${gasPrice}`);

          const endingFundMeBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(
            startingFundMeBalance + startingDeployerBalance,
            endingDeployerBalance + withdrawGasCost
          );

          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (const account of accounts) {
            assert.equal(
              (
                await fundMe.getAddressToAmountFunded(account.address)
              ).toString(),
              "0"
            );
          }
        });

        it("is allows us to withdraw with multiple funders", async function () {
          // Arrange
          const accounts = await ethers.getSigners();

          for (const account of accounts) {
            await fundMe.connect(account).fund({ value: sendValue });
          }

          // Act
          const startingFundMeBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait();

          if (!transactionReceipt) throw new Error("No transaction receipt");

          const { gasUsed, gasPrice } = transactionReceipt;
          const withdrawGasCost = gasUsed * gasPrice;

          console.log(`GasCost: ${withdrawGasCost}`);
          console.log(`GasUsed: ${gasUsed}`);
          console.log(`GasPrice: ${gasPrice}`);

          const endingFundMeBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(
            startingFundMeBalance + startingDeployerBalance,
            endingDeployerBalance + withdrawGasCost
          );

          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (const account of accounts) {
            assert.equal(
              (
                await fundMe.getAddressToAmountFunded(account.address)
              ).toString(),
              "0"
            );
          }
        });
      });
    });
