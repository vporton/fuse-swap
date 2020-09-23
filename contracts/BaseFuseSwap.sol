//SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity =0.6.6;

// import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v2-periphery/contracts/UniswapV2Router02.sol';
import './ABDKMath64x64.sol';
import './BaseToken.sol';

abstract contract BaseFuseSwap is BaseToken
{
    using ABDKMath64x64 for int128;

    string public name;
    uint8 public decimals;
    string public symbol;

    address payable constant FuseChainBridge = 0xd617774b9708F79187Dc7F03D3Bdce0a623F6988;
    address payable constant EthereumBridge = 0x3014ca10b91cb3D0AD85fEf7A3Cb95BCAc9c0f79;
    IERC20 constant FuseTokenOnEthereum = IERC20(0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d);
    UniswapV2Router02 constant uniswapV2Router02Address = UniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

    address payable public owner;
    int128 public ownerShare = int128(1).divi(int128(100)); // 1%

    uint256 totalDividends;
    mapping(address => uint256) lastTotalDivedends; // the value of totalDividends after the last payment to an address
    mapping(IERC20 => uint256) tokenTotalDividends; // token => amount
    mapping(IERC20 => mapping(address => uint256)) lastTokenTotalDivedends; // token => (shareholder => amount) // the value of totalDividends after the last payment to an address

    constructor(address payable _owner, uint256 _initialBalance) public {
        owner = _owner;
        name = "Ethereum/Fuse swap";
        decimals = 18;
        symbol = "EFS";
        balances[_owner] = _initialBalance;
        totalSupply = _initialBalance;
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

    function setOwnerShare(int128 _ownerShare) external onlyOwner {
        require(_ownerShare >= 0 && _ownerShare < int128(1 << 64), "Wrong share.");
        ownerShare = _ownerShare;
    }

    function exchangeEthereumTokenForFuse(IERC20 tokenIn, uint256 amountIn, uint256 amountOutMin) external {
        uint256 ownerAmount = ownerShare.mulu(amountIn);
        tokenTotalDividends[tokenIn] += ownerAmount;
        uint256 amountInRemaining = amountIn - ownerAmount;
        require(tokenIn.transfer(address(this), amountInRemaining), 'transfer failed');
        require(tokenIn.approve(address(uniswapV2Router02Address), amountInRemaining), 'approve failed');
        address[] memory path = new address[](2);
        path[0] = address(tokenIn);
        path[1] = address(FuseTokenOnEthereum);
        uniswapV2Router02Address.swapExactTokensForTokens(amountInRemaining, amountOutMin, path, msg.sender, block.timestamp);
        _deliverToBridge();
    }

    function exchangeETHForFuse(uint256 amountOutMin) external payable {
        uint256 ownerAmount = ownerShare.mulu(msg.value);
        totalDividends += ownerAmount;
        uint256 amountInRemaining = msg.value - ownerAmount;
        this.exchangeETHForFuseImpl{value: amountInRemaining}(amountOutMin);
    }

    function exchangeETHForFuseImpl(uint256 amountOutMin) external payable {
        address[] memory path = new address[](2);
        path[0] = uniswapV2Router02Address.WETH();
        path[1] = address(FuseTokenOnEthereum);
        uniswapV2Router02Address.swapExactETHForTokens{value: msg.value}(amountOutMin, path, msg.sender, block.timestamp);
        _deliverToBridge();
    }

    function _deliverToBridge() internal {
        // Better would be to check balance twice, but that would use gas.
        uint256 fuseAmount = FuseTokenOnEthereum.balanceOf(address(this)) - tokenTotalDividends[FuseTokenOnEthereum];
        FuseTokenOnEthereum.approve(address(this), fuseAmount);
        FuseTokenOnEthereum.transferFrom(address(this), msg.sender, fuseAmount);
        FuseTokenOnEthereum.transfer(Bridge(), fuseAmount);
    }

    function Bridge() internal virtual returns (address payable);

// PST //

    function _dividendsOwing(address payable _account) internal view returns(uint256) {
        uint256 _newDividends = totalDividends - lastTotalDivedends[_account];
        return (balances[_account] * _newDividends) / totalSupply; // rounding down
    }

    function dividendsOwing(address payable _account) external view returns(uint256) {
        return _dividendsOwing(_account);
    }

    function withdrawProfit() external {
        uint256 _owing = _dividendsOwing(msg.sender);

        // Against rounding errors. Not necessary because of rounding down.
        // if(_owing > address(this).balance) _owing = address(this).balance;

        if(_owing > 0) {
            msg.sender.transfer(_owing);
            lastTotalDivedends[msg.sender] = totalDividends;
        }
    }

    function _tokenDividendsOwing(IERC20 _token, address payable _account) internal view returns(uint256) {
        uint256 _newDividends = tokenTotalDividends[_token] - lastTokenTotalDivedends[_token][_account];
        return (balances[_account] * _newDividends) / totalSupply; // rounding down
    }

    function tokenDividendsOwing(IERC20 _token, address payable _account) external view returns(uint256) {
        return _tokenDividendsOwing(_token, _account);
    }

    function withdrawTokenProfit(IERC20 _token) external {
        uint256 _owing = _tokenDividendsOwing(_token, msg.sender);

        // Against rounding errors. Not necessary because of rounding down.
        // if(_owing > _token.balanceOf(address(this)) _owing = _token.balanceOf(address(this));

        if(_owing > 0) {
            require(_token.transfer(owner, _owing), 'transfer to shareholder failed.');
            lastTokenTotalDivedends[_token][msg.sender] = tokenTotalDividends[_token];
        }
    }
}
