const { expect } = require("chai");

describe("Bird", function () {
  async function deployBirdContract() {
    const [owner, otherAccount] = await ethers.getSigners();

    const Bird = await ethers.getContractFactory("Bird");
    const bird = await Bird.deploy("BirdNFT", "BRD", 25);

    return { bird, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set correct base values for NFT", async function () {
      const { bird } = await deployBirdContract();

      expect(await bird.name()).to.equal("BirdNFT");
      expect(await bird.symbol()).to.equal("BRD");
    });

    it("Should set the correct values for State Variables", async function () {
      const { bird } = await deployBirdContract();

      expect(await bird.MAX_BIRDS()).to.equal(25);
      expect(await bird.saleStatus()).to.equal(false);
      expect(await bird.maxBirdPurchase()).to.equal(20);
      expect(await bird.IA_PROVENANCE()).to.equal("");
      expect(await bird.REVEAL_TIMESTAMP()).to.equal("");
    });

    it("Should set owner correctly", async function () {
      const { bird, owner } = await deployBirdContract();
      expect(await bird.owner()).to.equal(owner.address);
    });

    it("Should set the NFT Price = 0.08 ETH", async function () {
      const birdPrice = "0.08"; //0.08 ETH
      const amount = ethers.utils.parseEther(birdPrice);

      const { bird } = await deployBirdContract();
      expect(await bird.birdPrice()).to.equal(amount);
    });
  });

  describe("Flipping Sale Status", function () {
    it("Should revert with the right error if called from another account", async function () {
      const { bird, otherAccount } = await deployBirdContract();
      await expect(
        bird.connect(otherAccount).saleStatusFlipper()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should flip sale status correctly if called by owner", async function () {
      const { bird } = await deployBirdContract();
      const saleStatus = await bird.saleStatus();
      await expect(bird.saleStatusFlipper()).not.to.be.reverted;
      expect(await bird.saleStatus()).to.equal(!saleStatus);
    });
  });

  describe("Reserve Birds", function () {
    it("Should revert with the right error if called from another account", async function () {
      const { bird, otherAccount } = await deployBirdContract();
      await expect(
        bird.connect(otherAccount).reserveBirds()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should only reserve allowed number of Tokens", async function () {
      const { bird } = await deployBirdContract();
      await expect(bird.reserveBirds()).to.be.revertedWith(
        "Reserve would exceed max supply of birds"
      );
    });

    it("Should Reserve Birds correctly if called by owner", async function () {
      const { bird, owner } = await deployBirdContract();
      expect(await bird.balanceOf(owner.address)).to.equal(0);
      await expect(bird.reserveBirds())
        .to.emit(bird, "Transfer")
        .withArgs(
          "0x0000000000000000000000000000000000000000",
          owner.address,
          0
        );
      expect(await bird.balanceOf(owner.address)).to.equal(30);
      for (let i = 0; i < 30; i++) {
        expect(await bird.ownerOf(i)).to.equal(owner.address);
        expect(await bird.tokenURI(i)).to.equal("xyz" + i);
      }
    });
  });

  describe("Mintbirds", function () {
    const totalPrice = ethers.utils.parseEther("15.2");
    it("Should revert with sale status is inactive", async function () {
      const { bird, otherAccount } = await deployBirdContract();
      await expect(bird.mintbird(5)).to.be.revertedWith(
        "Sale must be active to mint bird"
      );
    });

    it("Should revert when try to mint more than 20 NFTs", async function () {
      const { bird, otherAccount } = await deployBirdContract();
      await expect(bird.saleStatusFlipper()).not.to.be.reverted;
      await expect(bird.mintbird(25)).to.be.revertedWith(
        "Can only mint 20 tokens at a time"
      );
    });

    it("Should revert when tried to mint more than MAX_BIRDS NFTs", async function () {
      const { bird, otherAccount } = await deployBirdContract();
      await expect(bird.saleStatusFlipper()).not.to.be.reverted;
      await expect(bird.mintbird(19, { value: totalPrice })).not.to.be.reverted;
      await expect(bird.mintbird(19, { value: totalPrice })).to.be.revertedWith(
        "Purchase would exceed max supply of birds"
      );
    });

    it("Should revert when enough ether not sent", async function () {
      const { bird, otherAccount } = await deployBirdContract();
      await expect(bird.saleStatusFlipper()).not.to.be.reverted;
      await expect(bird.mintbird(5, { value: 0 })).to.be.revertedWith(
        "Ether value sent is not correct"
      );
    });

    it("Should allow everyone to mint new NFTs", async function () {
      const { bird, otherAccount } = await deployBirdContract();
      await expect(bird.saleStatusFlipper()).not.to.be.reverted;
      await expect(
        bird.connect(otherAccount).mintbird(19, { value: totalPrice })
      ).not.to.be.reverted;
    });

    it("Should set all properties correctly for new minted NFTs", async function () {
      const { bird, owner } = await deployBirdContract();
      await expect(bird.saleStatusFlipper()).not.to.be.reverted;

      expect(await bird.balanceOf(owner.address)).to.equal(0);
      await expect(bird.mintbird(19, { value: totalPrice }))
        .to.emit(bird, "Transfer")
        .withArgs(
          "0x0000000000000000000000000000000000000000",
          owner.address,
          0
        );
      expect(await bird.balanceOf(owner.address)).to.equal(19);
      for (let i = 0; i < 19; i++) {
        expect(await bird.ownerOf(i)).to.equal(owner.address);
        expect(await bird.tokenURI(i)).to.equal("xyz" + i);
      }
    });
  });

  describe("Withdrawals", function () {
    it("Should revert with the right error if called from another account", async function () {
      const { bird, otherAccount } = await deployBirdContract();
      await expect(bird.connect(otherAccount).withdraw()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("Should transfer the funds to the owner", async function () {
      const { bird, owner } = await deployBirdContract();
      const numberOfTokens = 1;
      const totalPrice = ethers.utils.parseEther("0.8");
      await expect(bird.saleStatusFlipper()).not.to.be.reverted;
      await expect(bird.mintbird(numberOfTokens, { value: totalPrice })).not.to
        .be.reverted;
      await expect(bird.withdraw()).to.changeEtherBalances(
        [owner, bird],
        [totalPrice, ethers.BigNumber.from("-" + totalPrice)]
      );
    });
  });

  describe("Setting Reveal Timestamp", function () {
    const newTimestampValue = 10000;
    it("Should revert with the right error if called from another account", async function () {
      const { bird, otherAccount } = await deployBirdContract();
      await expect(
        bird.connect(otherAccount).setRevealTimestamp(newTimestampValue)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should set Reveal Timestamp correctly if called by owner", async function () {
      const { bird } = await deployBirdContract();
      await expect(bird.setRevealTimestamp(newTimestampValue)).not.to.be
        .reverted;
      expect(await bird.REVEAL_TIMESTAMP()).to.equal(newTimestampValue);
    });
  });

  describe("Setting Provenance Hash", function () {
    const newProvenanceHashValue = "Provenance Hash Value";
    it("Should revert with the right error if called from another account", async function () {
      const { bird, otherAccount } = await deployBirdContract();
      await expect(
        bird.connect(otherAccount).setProvenanceHash(newProvenanceHashValue)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should set Provenance Hash correctly if called by owner", async function () {
      const { bird } = await deployBirdContract();
      await expect(bird.setProvenanceHash(newProvenanceHashValue)).not.to.be
        .reverted;
      expect(await bird.IA_PROVENANCE()).to.equal(newProvenanceHashValue);
    });
  });
});
