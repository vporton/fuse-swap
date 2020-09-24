"strict";

// FIXME: Check contract calls
// TODO: Show waiting indicator

let mySwap;
let uniswap;
let fuseContract;

let myShare;

let tokenSymbol;

window.onload = async function() {
    onResize();
    await commonOnLoad();
    if (window.ethereum) {
        uniswap = new web3.eth.Contract(JSON.parse(factoryAbi), factoryContractAddress);
        mySwap = new web3.eth.Contract(JSON.parse(mySwapAbi), mySwapAddress);
        const userAccount = (await defaultAccountPromise())[0]; // FIXME
        fuseContract = new web3.eth.Contract(JSON.parse(erc20Abi), fuseToken);
        // TODO: Parallel queries
        fuseContract.methods.allowance(userAccount, mySwapAddress).call()
            .then(allowance => {
                const big = (new web3.utils.BN(2)).pow(new web3.utils.BN(128)).sub(new web3.utils.BN(1));
                if((new web3.utils.BN(allowance)).gte(big))
                    showApproval();
            });
        myShare = await mySwap.methods.ownerShare().call() / 2**64;
        // myShare = 0.01;
    }
}

let defaultAccount;
// web3.eth.defaultAccount = web3.eth.accounts[0];
async function defaultAccountPromise() {
    return web3 && web3.currentProvider ? web3.eth.getAccounts() : null;
}

function checkNumber(n) {
    return /^[0-9]+(\.[0-9]+)?$/.test(n);
}

async function displayRate() {
    const isETH = document.getElementById("tokenKindETH").checked;
    const token = document.getElementById('erc20').value;
    const sell = document.getElementById('sell').value;
    const buy = document.getElementById('buy').value;
    const rate = buy / sell;
    if(isETH) {
        rateStr = `1 ETH = ${rate} FUSE`;
    } else {
        rateStr = `1 ${tokenSymbol} = ${rate} FUSE`;
    }
    document.getElementById('rate').textContent = rateStr;
}

async function calcOutput() {
    document.getElementById('swap').disabled = true;
    document.getElementById('refresh').style = "display: none";
    const isETH = document.getElementById("tokenKindETH").checked;
    const sellTyped = document.getElementById('sell').value;
    const erc20Typed = document.getElementById('erc20').value; // 0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d
    const slippageTyped = document.getElementById('slippage').value;
    if(!checkNumber(sellTyped) || !checkNumber(slippageTyped) || (!isETH && !web3.utils.isAddress(erc20Typed))) return;
    const sell = web3.utils.toWei(sellTyped);
    const uniswapV2Router02 = new web3.eth.Contract(JSON.parse(routerAbi), uniswapV2Router02Address);
    const tokenAddress = isETH ? await uniswapV2Router02.methods.WETH().call() : erc20Typed;
    await uniswapV2Router02.methods.getAmountsOut(sell, [tokenAddress, fuseToken]).call()
        .then(async p => {
            document.getElementById('swap').disabled = false;
            document.getElementById('refresh').style = "display: inline";
            document.getElementById('buy').value = web3.utils.fromWei(p[1]) * (1 - myShare);
            await displayRate();
            return p;
        });
}

async function calcInput() {
    document.getElementById('swap').disabled = true;
    document.getElementById('refresh').style = "display: none";
    const isETH = document.getElementById("tokenKindETH").checked;
    const buyTyped = document.getElementById('buy').value;
    const erc20Typed = document.getElementById('erc20').value; // 0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d
    const slippageTyped = document.getElementById('slippage').value;
    if(!checkNumber(buyTyped) || !checkNumber(slippageTyped) || (!isETH && !web3.utils.isAddress(erc20Typed))) return;
    const buy = web3.utils.toWei(document.getElementById('buy').value);
    const uniswapV2Router02 = new web3.eth.Contract(JSON.parse(routerAbi), uniswapV2Router02Address);
    const tokenAddress = isETH ? await uniswapV2Router02.methods.WETH().call() : erc20Typed;
    await uniswapV2Router02.methods.getAmountsIn(buy, [tokenAddress, fuseToken]).call()
        .then(async p => {
            document.getElementById('swap').disabled = false;
            document.getElementById('refresh').style = "display: inline";
            document.getElementById('sell').value = web3.utils.fromWei(p[0]) / (1 - myShare);
            await displayRate();
            return p;
        });
}

async function swap() {
    const isETH = document.getElementById("tokenKindETH").checked;
    const erc20Typed = document.getElementById('erc20').value;
    const amountIn = web3.utils.toWei(document.getElementById('sell').value);
    const amountOutTyped = document.getElementById('buy').value;
    const slippage = document.getElementById('slippage').value / 100;
    const amountOutMin = web3.utils.toWei((amountOutTyped * (1 - slippage)).toFixed(15)); // toWei() does not accept more 15 signs
    // TODO: waiting UI
    const from = (await defaultAccountPromise())[0]; // FIXME
    if(isETH) {
        console.log(amountOutMin)
        await mySend(mySwap, mySwap.methods.exchangeETHForFuse, [amountOutMin], { from, value: amountIn });
    } else {
        await mySend(mySwap, mySwap.methods.exchangeEthereumTokenForFuse, [erc20Typed, amountIn, amountOutMin], { from });
    }
}

async function tokenChange() {
    const token = document.getElementById('erc20').value;
    if(!web3.utils.isAddress(token)) {
        document.getElementById('tokenInfo').textContent = "";
        return;
    }
    const tokenContract = new web3.eth.Contract(JSON.parse(erc20Abi), token);
    
    const [symbol, name] = await Promise.all([tokenContract.methods.symbol().call(),
                                              tokenContract.methods.name().call()]);
    document.getElementById('tokenInfo').textContent = `${symbol} / ${name}`;
    tokenSymbol = symbol;
}

async function approve() {
    const from = (await defaultAccountPromise())[0]; // FIXME
    const big = (new web3.utils.BN(2)).pow(new web3.utils.BN(256)).sub(new web3.utils.BN(1)).toString();
    mySend(fuseContract, fuseContract.methods.approve, [mySwapAddress, big], { from })
        .then(() => {
            showApproval();
            alert("You are approved!");
        });
}

function showApproval() {
    document.getElementById("approvePar").style.display = "none";
    document.getElementById("disapproval").style.display = "none";
}

function onResize() {
    document.getElementById('disapproval').style.width = document.getElementById('disapprovalContainer').offsetWidth + 'px';
    document.getElementById('disapproval').style.height = document.getElementById('disapprovalContainer').offsetHeight + 'px';
}