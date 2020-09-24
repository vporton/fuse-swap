"strict";

// FIXME: Check contract calls
// TODO: Show waiting indicator

let mySwap;

window.onload = async function() {
    await commonOnLoad();
    if(window.ethereum) {
        mySwap = new web3.eth.Contract(JSON.parse(mySwapAbi), mySwapAddress);
        const userAccount = (await defaultAccountPromise())[0]; // FIXME
        const sum = await mySwap.methods.dividendsOwing(userAccount).call();
        document.getElementById('eth').textContent = web3.utils.fromWei(sum);
    }
}

let defaultAccount;
// web3.eth.defaultAccount = web3.eth.accounts[0];
async function defaultAccountPromise() {
    return web3 && web3.currentProvider ? web3.eth.getAccounts() : null;
}

async function withdraw() {
    const userAccount = (await defaultAccountPromise())[0]; // FIXME
    await mySwap.methods.withdrawProfit().send({ from: userAccount });
}