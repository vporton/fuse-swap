//SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity =0.6.6;

// import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v2-periphery/contracts/UniswapV2Router02.sol';
import './ABDKMath64x64.sol';

abstract contract BaseFuseExchange
{
    using ABDKMath64x64 for int128;

    address payable constant FuseChainBridge = 0xd617774b9708F79187Dc7F03D3Bdce0a623F6988;
    address payable constant EthereumBridge = 0x3014ca10b91cb3D0AD85fEf7A3Cb95BCAc9c0f79;
    IERC20 constant FuseTokenOnEthereum = IERC20(0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d);
    UniswapV2Router02 constant uniswapV2Router02Address = UniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

    address payable public owner;
    int128 public ownerShare = int128(1).divi(int128(100)); // 1%

    constructor(address payable _owner) public {
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    function setOwner(address payable _owner) external onlyOwner {
        require(_owner != address(0), "Zero address");
        owner = _owner;
    }

    function removeOwner() external onlyOwner {
        owner = address(0);
    }

    function setOwnerShare(int128 _ownerShare) external onlyOwner{
        require(_ownerShare >= 0 && _ownerShare < int128((1 << 128) - 1), "Wrong share.");
        ownerShare = _ownerShare;
    }

    function exchangeEthereumTokenForFuse(IERC20 tokenIn, uint256 amountIn, uint256 amountOutMin) external {
        uint256 ownerAmount = ownerShare.mulu(amountIn);
        require(tokenIn.transferFrom(msg.sender, owner, ownerAmount), 'transfer to owner failed.');
        uint256 amountInRemaining = amountIn - ownerAmount;
        require(tokenIn.transferFrom(msg.sender, address(this), amountInRemaining), 'transferFrom failed.');
        require(tokenIn.approve(address(uniswapV2Router02Address), amountInRemaining), 'approve failed.');
        address[] memory path = new address[](2);
        path[0] = address(tokenIn);
        path[1] = address(FuseTokenOnEthereum);
        uniswapV2Router02Address.swapExactTokensForTokens(amountInRemaining, amountOutMin, path, msg.sender, block.timestamp);
        FuseTokenOnEthereum.transfer(Bridge(), FuseTokenOnEthereum.balanceOf(address(this)));
    }

    function exchangeETHForFuse(uint256 amountOutMin) external payable {
        uint256 ownerAmount = ownerShare.mulu(msg.value);
        owner.transfer(ownerAmount);
        uint256 amountInRemaining = msg.value - ownerAmount;
        this.exchangeETHForFuseImpl{value: amountInRemaining}(amountOutMin);
    }

    function exchangeETHForFuseImpl(uint256 amountOutMin) external payable {
        address[] memory path = new address[](2);
        path[0] = uniswapV2Router02Address.WETH();
        path[1] = address(FuseTokenOnEthereum);
        uniswapV2Router02Address.swapExactETHForTokens(amountOutMin, path, msg.sender, block.timestamp);
        FuseTokenOnEthereum.transfer(Bridge(), FuseTokenOnEthereum.balanceOf(address(this)));
    }

    function Bridge() internal virtual returns (address payable);
}
