const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const {interface, bytecode} = require('../compile');

let lottery;
let accounts;

beforeEach(async () => {

    accounts = await web3.eth.getAccounts();

    lottery = await new web3.eth.Contract(JSON.parse(interface))
        .deploy({data: bytecode})
        .send({from: accounts[0], gas: '1000000'});
});

describe('Lottery Contract', () => {
    it('deploys a contract', () => {
        assert.ok(lottery.options.address);
    });

    it('allows one account to enter', async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('0.02', 'ether')    
            // Convert eth value to wei
        });

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });

        // (value_it_shd_be, value_it_is)
        assert.equal(accounts[0], players[0]);
        assert.equal(1, players.length);
    });

    it('allows multiple account to enter', async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('0.02', 'ether')  
        });

        await lottery.methods.enter().send({
            from: accounts[1],
            value: web3.utils.toWei('0.02', 'ether')  
        });

        await lottery.methods.enter().send({
            from: accounts[2],
            value: web3.utils.toWei('0.02', 'ether')  
        });

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });

        assert.equal(accounts[0], players[0]);
        assert.equal(accounts[1], players[1]);
        assert.equal(accounts[2], players[2]);

        assert.equal(3, players.length);
    });

    it('requires a minimum amount of ether to enter', async () => {
        
        // Try to catch if error occured
        try {

            // It should fail
            await lottery.methods.enter().send({
                from: accounts[0],
                value: 100      // Wei
            });

            // If it does not fail, our logic implementation is wrong
            assert(false);
        }
        catch (err) {

            // It should catch error - assert that error was present
            assert(err);
        }
    });

    it('allows only manager to call(send) pickWinner', async () => {

        try {

            await lottery.methods.pickWinner().send({
                // Not manager
                from: accounts[1]   
            });

            // If we get to this line of code automatically fail
            assert(false);
        }
        catch (err) {
            assert(err);
        }
    });

    it('sends money to the winner and resets the players array', async () => {

        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('2', 'ether')
        });

        // Get balance held by an eth address in Wei
        const initialBalance = await web3.eth.getBalance(accounts[0]);

        await lottery.methods.pickWinner().send({
            from: accounts[0]
        });

        const finalBalance = await web3.eth.getBalance(accounts[0]);

        const diff = finalBalance - initialBalance;
        assert(diff > web3.utils.toWei('1.8', 'ether'));

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });
        assert.equal(0, players.length);
    });
});