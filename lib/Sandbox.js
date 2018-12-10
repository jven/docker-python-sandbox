"use strict";

let _           = require('lodash')
let async       = require('async')
let Container   = require('./Container')
let PoolManager = require('./PoolManager')
let Job         = require('./Job')
let fs          = require('fs-extra')
let log         = require('winston')
var Docker      = require('dockerode')

const defaultOptions = {
  "poolSize": 1,
  "memoryLimitMb": 50, 
  "imageName": "pythonbee/docker_sandbox",
  "timeoutMs": 10000
};

const noop = () => {}

class Sandbox {
    
  constructor(options) {
      this.options = _.defaults(options, defaultOptions)
      
      this.options.containerLaunchOptions = {
        "Image": this.options.imageName,
        "NetworkDisabled": false, 
        "AttachStdin": false,
        "AttachStdout": false,
        "AttachStderr": false,
        "OpenStdin": false, 
        "Privileged": false,
        "User": "sandboxuser",
        "Tty": false,
        "HostConfig": {
            "Memory": this.options.memoryLimitMb * 1000000, 
            "MemorySwap": -1,
            "Privileged": false, 
            "CpusetCpus": "0", // only use one core
            "PortBindings": {
              "3000/tcp": [{
                "HostIp": "127.0.0.1",
                // This is overridden in PoolManager#_initializeContainer.
                "HostPort": ""
              }]
            }
        }, 
        "Labels": {
          "__docker_sandbox": "1"
        },
        ExposedPorts: {
          "3000/tcp": {}
        }
      };
      
      this.docker  = new Docker()
      this.manager = new PoolManager(this.docker, options)
      
      const cleanupEvents = ['beforeExit', 'SIGINT']
      const cleanupFn = this.cleanup.bind(this, true)
      cleanupEvents.map(event => {
        process.on(event, cleanupFn)
      });
      
  }
  
  /*
   * Initializes the sandbox by creating the pool of
   * containers
   */
  initialize(cb) {
    this.manager.initialize(this.options.poolSize, cb)
  }
  
  /*
   *  (deprecated, use 'initialize')
   *  Initializes the pool and creates required containers
   */
  createPool (cb) {
    this.manager.initialize(this.options.poolSize, cb)
  }
  
  /*
   * Runs the specifed code with the given options:
   *
   * {
   *   code: string,
   *   lang: string,
   *   timeoutMs: number,
   *   testCases: [{
   *     params: [{
   *       type: string,
   *       value: string
   *     }],
   *     expected: {
   *       type: string,
   *       value: string
   *     }
   *   }]
   * }
   */
  run (options, cb) {
    var error = null;
    if (!options) {
      error = 'No options!';
    } else if (!_.isString(options.code)) {
      error = 'No code!';
    } else if (!_.isString(options.lang)) {
      error = 'No language!';
    } else if (!_.isNumber(options.timeoutMs)) {
      error = 'No timeout!';
    } else if (!options.testCases) {
      error = 'No test cases!';
    }
    if (error) {
      throw new Error(error);
      return;
    }
      
    const job = new Job(
        options.code, options.lang, options.timeoutMs, options.testCases, cb);
    this.manager.executeJob(job);
  }
  
      
  /* 
   *  Cleanups various resources such as temporary
   *  files and docker containers
   */
  cleanup(cb) {
    log.debug("cleaning up")
    
    if (typeof cb === 'boolean') {
      cb = null
      var exit = true;
    }
    else {
      cb = cb || _.noop
    }
    
    this.manager.cleanup( err => {
      if (cb) return cb(err)
      else if (exit) process.exit();
    })
  }
  
}

module.exports = Sandbox
module.exports.defaultOptions = defaultOptions
