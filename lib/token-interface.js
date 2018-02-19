


const Tx = require('ethereumjs-tx')

var tokenContractJSON = require('../app/assets/contracts/_0xBitcoinToken.json');
var deployedContractInfo = require('../app/assets/contracts/DeployedContractInfo.json');
var web3Utils = require('web3-utils')


var busySendingSolution = false;
var queuedMiningSolutions = [];


var lastSubmittedMiningSolutionChallengeNumber;



module.exports =  {


  async init(redisInterface, web3, accountConfig, poolConfig, test_mode )
  {
    this.redisInterface=redisInterface;
    this.web3=web3;
    this.test_mode = test_mode;
    this.poolConfig = poolConfig;
    this.accountConfig=accountConfig;
    this.tokenContract =  new web3.eth.Contract(tokenContractJSON.abi,this.getTokenContractAddress())



  //  this.difficultyTarget = 111;
    //this.challengeNumber = 1111;

    await this.collectTokenParameters();

    var self=this;
    setInterval(function(){self.collectTokenParameters()},2000);


    busySendingSolution = false;

    setInterval(function(){ self.sendMiningSolutions()} , 500)



  },

  getPoolChallengeNumber()
  {
    return this.challengeNumber;
  },

  getPoolDifficultyTarget()
  {
    return this.difficultyTarget;
  },

  getPoolDifficulty()
  {
    return this.miningDifficulty;
  },


  async collectTokenParameters( )
  {


    var miningDifficultyString = await this.tokenContract.methods.getMiningDifficulty().call()  ;
    var miningDifficulty = parseInt(miningDifficultyString)

    var miningTargetString = await this.tokenContract.methods.getMiningTarget().call()  ;
    var miningTarget = web3Utils.toBN(miningTargetString)

    var challengeNumber = await this.tokenContract.methods.getChallengeNumber().call() ;

    console.log('Mining difficulty:', miningDifficulty);
    console.log('Challenge number:', challengeNumber)

      this.miningDifficulty = miningDifficulty;
      this.difficultyTarget = miningTarget;
      this.challengeNumber = challengeNumber;

  },

  getTokenContractAddress()
  {
    if(this.test_mode)
    {
      return deployedContractInfo.networks.testnet.contracts._0xbitcointoken.blockchain_address;
    }else{
      return deployedContractInfo.networks.mainnet.contracts._0xbitcointoken.blockchain_address;
    }

  },




  async sendMiningSolutions()
    {


    //  console.log( 'sendMiningSolutions' )
      if(busySendingSolution == false)
      {
        if(queuedMiningSolutions.length > 0)
        {
          //busySendingSolution = true;


          var nextSolution = queuedMiningSolutions.pop();

          console.log("Popping queued mining solution " + nextSolution.toString())


          if( nextSolution.challenge_number != lastSubmittedMiningSolutionChallengeNumber)
          {
            lastSubmittedMiningSolutionChallengeNumber =  nextSolution.challenge_number;
            //console.log('popping mining solution off stack ')

            try{
            var response = await this.submitMiningSolution(nextSolution.addressFrom,
              nextSolution.solution_number, nextSolution.challenge_digest);


              console.log('submitted mining solution!!')


              var submitted_transaction_id = response;
              this.storeSubmittedSolutionTransactionHash(response)

            }catch(e)
            {

              console.log(e);
            }
          }

          busySendingSolution = false;
        }
      }



    },


  async storeSubmittedSolutionTransactionHash(tx_hash)
  {

    var txData = {
      mined: false,  //completed being mined ?
      rewarded: false   //did we win the reward of 50 tokens ?
    }

     this.redisInterface.storeRedisHashData('submitted_solution_tx',tx_hash,JSON.stringify(txData) )
  },


  async queueMiningSolution( solution_number,addressFrom,challenge_digest,challenge_number )
  {
    console.log('queueMiningSolution ')
    queuedMiningSolutions.push({
      addressFrom: addressFrom,    //we use this differently in the pool!
      solution_number: solution_number,
      challenge_digest: challenge_digest,
      challenge_number: challenge_number
    });

  },






  async submitMiningSolution(minerAddress,solution_number,challenge_digest){

    var addressFrom = this.getPoolAccount().address;

    console.log( '\n' )
    console.log( '---Submitting solution for reward---')
    console.log( 'nonce ',solution_number )
    console.log( 'challenge_digest ',challenge_digest )
    console.log( '\n' )

   var mintMethod = this.tokenContract.methods.mint(solution_number,challenge_digest);

  try{
    var txCount = await this.web3.eth.getTransactionCount(addressFrom);
    console.log('txCount',txCount)
   } catch(error) {  //here goes if someAsyncPromise() rejected}
    console.log(error);

     return error;    //this will result in a resolved promise.
   }


   var addressTo = this.tokenContract.options.address;


    var txData = this.web3.eth.abi.encodeFunctionCall({
            name: 'mint',
            type: 'function',
            inputs: [{
                type: 'uint256',
                name: 'nonce'
            },{
                type: 'bytes32',
                name: 'challenge_digest'
            }]
        }, [solution_number, challenge_digest]);



    var max_gas_cost = 1704624;

    var estimatedGasCost = await mintMethod.estimateGas({gas: max_gas_cost, from:addressFrom, to: addressTo });


    console.log('estimatedGasCost',estimatedGasCost);
    console.log('txData',txData);

    console.log('addressFrom',addressFrom);
    console.log('addressTo',addressTo);



    if( estimatedGasCost > max_gas_cost){
      console.log("Gas estimate too high!  Something went wrong ")
      return;
    }


    const txOptions = {
      nonce: web3Utils.toHex(txCount),
      gas: web3Utils.toHex(estimatedGasCost),
      gasPrice: web3Utils.toHex(web3Utils.toWei(this.poolConfig.gasPriceWei.toString(), 'gwei') ),
      value: 0,
      to: addressTo,
      from: addressFrom,
      data: txData
    }

    var privateKey =  this.getPoolAccount().privateKey;

  return new Promise(function (result,error) {

       this.sendSignedRawTransaction(this.web3,txOptions,addressFrom,privateKey, function(err, res) {
        if (err) error(err)
          result(res)
      })

    }.bind(this));


  },




  async sendSignedRawTransaction(web3,txOptions,addressFrom,private_key,callback) {

    var privKey = this.truncate0xFromString( private_key )

    const privateKey = new Buffer( privKey, 'hex')
    const transaction = new Tx(txOptions)


    transaction.sign(privateKey)


    const serializedTx = transaction.serialize().toString('hex')

      try
      {
        var result =  web3.eth.sendSignedTransaction('0x' + serializedTx, callback)
      }catch(e)
      {
        console.log(e);
      }
  },


   truncate0xFromString(s)
  {
    if(s.startsWith('0x')){
      return s.substring(2);
    }
    return s;
  },

   getPoolAccount()
   {
     return this.accountConfig;
   }




}