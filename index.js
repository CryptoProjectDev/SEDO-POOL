var web3Utils = require('web3-utils')
var INFURA_ROPSTEN_URL = 'https://ropsten.infura.io/f12d6274997840158b99b418f0ed8ec1';
var INFURA_MAINNET_URL = 'https://mainnet.infura.io/f12d6274997840158b99b418f0ed8ec1';


var https_enabled = process.argv[2] === 'https';
var pool_env = 'production';

if( process.argv[2] == "test" )
{
  pool_env = 'test'
}

if( process.argv[2] == "staging" )
{
  pool_env = 'staging'
}

var cluster = require('cluster')

const poolConfig = require('./pool.config').config

console.log(poolConfig)

console.log('init');

fs = require('fs');

var redisInterface = require('./lib/redis-interface')
var peerInterface = require('./lib/peer-interface')
var tokenInterface = require('./lib/token-interface')
var webInterface = require('./lib/web-interface')
var webServer =  require('./lib/web-server')
var diagnosticsManager =  require('./lib/diagnostics-manager')
var accountConfig;
var Web3 = require('web3')

var web3 = new Web3()


var specified_web3 = poolConfig.web3provider;

 if(specified_web3 != null)
 {
   web3.setProvider(specified_web3)
   console.log('using web3',specified_web3)
 }

if(pool_env == "test"){
  console.log("Using test mode!!! - Ropsten ")
  if(specified_web3 == null)
  {
    web3.setProvider(INFURA_ROPSTEN_URL)
  }
   accountConfig = require('./test.account.config').accounts;
}else if(pool_env == "staging"){
    console.log("Using staging mode!!! - Mainnet ")
    if(specified_web3 == null)
    {
     web3.setProvider(INFURA_MAINNET_URL)
   }
   accountConfig = require('./account.config').accounts;
}else{
    if(specified_web3 == null)
    {
     web3.setProvider(INFURA_MAINNET_URL)
    }
   accountConfig = require('./account.config').accounts;
}


init(web3);


/*
async function init(web3)
{


        // Code to run if we're in the master process
      if (cluster.isMaster) {

          // Count the machine's CPUs
        //  var cpuCount = require('os').cpus().length;

          // Create a worker for each CPU
          for (var i = 0; i < 6; i += 1) {
              cluster.fork();
          }


           await redisInterface.init()
           await webInterface.init(web3,accountConfig,poolConfig,redisInterface)
           await tokenInterface.init(redisInterface,web3,accountConfig,poolConfig,pool_env)
           await peerInterface.init(web3,accountConfig,poolConfig,redisInterface,tokenInterface,pool_env) //initJSONRPCServer();
           await diagnosticsManager.init(redisInterface,webInterface,peerInterface)

           await webServer.init(https_enabled,webInterface,peerInterface)


      // Code to run if we're in a worker process
      } else {
        var worker_id = cluster.worker.id


            if(worker_id == 1)
            {
               await redisInterface.init()
               await tokenInterface.init(redisInterface,web3,accountConfig,poolConfig,pool_env)


               await peerInterface.init(web3,accountConfig,poolConfig,redisInterface,tokenInterface,pool_env) //initJSONRPCServer();
               tokenInterface.update();
               peerInterface.update();
            }
            if(worker_id == 2)
            {
              await redisInterface.init()
              await tokenInterface.init(redisInterface,web3,accountConfig,poolConfig,pool_env)
              await peerInterface.init(web3,accountConfig,poolConfig,redisInterface,tokenInterface,pool_env) //initJSONRPCServer();
              //tokenInterface.update();
              peerInterface.listenForJSONRPC(8080);
            }
      }





}
*/
async function init(web3)
{
      
//	   var gas = await web3.eth.getGasPrice()*4;
//           console.log('gas price from network',gas);
//	   var cfgGas = poolConfig.solutionGasPriceWei*1000000000;
//	   console.log('gas price from pool config',cfgGas);
//	   if(gas > cfgGas)  gas = cfgGas;
//	   console.log('optimized gas price',gas);
	  

// Code to run if we're in the master process
      if (cluster.isMaster) {

          // Create a worker for each CPU
          for (var i = 0; i < 8; i += 1) {
              cluster.fork();
          }


	

           await redisInterface.init()
           await webInterface.init(web3,accountConfig,poolConfig,redisInterface)
           await tokenInterface.init(redisInterface,web3,accountConfig,poolConfig,pool_env)
           await peerInterface.init(web3,accountConfig,poolConfig,redisInterface,tokenInterface,pool_env) //initJSONRPCServer();
           await diagnosticsManager.init(redisInterface,webInterface,peerInterface)

           await webServer.init(https_enabled,webInterface,peerInterface)
	   
 	   peerInterface.update();  //16.18.2018 -> https://github.com/snissn/tokenpool/commit/adf465675e58507dc4e082fa8be0045f8274f4af	

	   




      // Code to run if we're in a worker process
      } else {
        var worker_id = cluster.worker.id

              await redisInterface.init()
              await tokenInterface.init(redisInterface,web3,accountConfig,poolConfig,pool_env)
              await peerInterface.init(web3,accountConfig,poolConfig,redisInterface,tokenInterface,pool_env) //initJSONRPCServer();
              await redisInterface.init()
              await tokenInterface.init(redisInterface,web3,accountConfig,poolConfig,pool_env)
              peerInterface.listenForJSONRPC(8080);
              tokenInterface.update();
              peerInterface.update();
      }
}

