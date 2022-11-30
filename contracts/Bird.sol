pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Bird is ERC721, Ownable {

    //**************  STATE VARIABLES  ****************//
    /////////////////////////////////////////////////////
    string public IA_PROVENANCE = "";
    uint256 public startingIndexBlock;
    uint256 public startingIndex;
    uint256 public immutable birdPrice = 800000000000000000; //0.08 ETH
    uint256 public immutable maxBirdPurchase = 20;
    uint256 public MAX_BIRDS;
    uint256 public REVEAL_TIMESTAMP;
    uint256 internal _totalSupply;
    bool public saleStatus = false;

    constructor(string memory name, string memory symbol, uint256 maxNftSupply) ERC721(name, symbol) {
        MAX_BIRDS = maxNftSupply;
    }


    //***************  CONTRACT LOGIC  *****************//
    //////////////////////////////////////////////////////
    function saleStatusFlipper() public onlyOwner {
        saleStatus = !saleStatus;
    }

    function reserveBirds() public onlyOwner {
        for (uint256 i = 0; i < 30; i++) {
            _safeMint(msg.sender, _totalSupply);
            _totalSupply++;
        }
    }

    function mintbird(uint numberOfTokens) public payable {
        require(saleStatus, "Sale must be active to mint bird");
        require(numberOfTokens < maxBirdPurchase, "Can only mint 20 tokens at a time");
        require(_totalSupply + numberOfTokens <= MAX_BIRDS, "Purchase would exceed max supply of birds");
        require(birdPrice * numberOfTokens <= msg.value, "Ether value sent is not correct");

        for(uint i = 0; i < numberOfTokens; i++) {
            uint mintIndex = _totalSupply;
            if (_totalSupply < MAX_BIRDS) {
                _safeMint(msg.sender, mintIndex);
                _totalSupply++;
            }
        }

    }

    function withdraw() public onlyOwner {
        uint balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }


    //**************  SETTER FUNCTIONS  ****************//
    //////////////////////////////////////////////////////
    function _baseURI() internal pure override returns (string memory) {
        return "xyz";
    }

    function setRevealTimestamp(uint256 revealTimeStamp) public onlyOwner {
        REVEAL_TIMESTAMP = revealTimeStamp;
    }

    function setProvenanceHash(string memory provenanceHash) public onlyOwner {
        IA_PROVENANCE = provenanceHash;
    }

}