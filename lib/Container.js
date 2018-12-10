"use strict";

let _       = require('lodash')
let async   = require('async')
let request = require('request')
let fs      = require('fs-extra')
let log     = require('winston')

/*
 * A class representing a Docker container.
 *
 * The "instance" field corresponds to a Dockerode container instance
 */
class Container {
  constructor(id, instance) {
    this.id = id
    this.instance = instance
    this.hostPort = 3000
    this.cleanedUp = false
  }
   
  /* 
   * Executes a job inside the container
   */
  executeJob(job, cb) {
    const options = {
      url: "http://localhost:" + this.hostPort + "/", 
      json: true, 
      body: {
        code: job.code,
        lang: job.lang,
        timeoutMs: job.timeoutMs, 
        testCases: job.testCases
      }, 
      timeout: job.timeoutMs + 500
    };
    
    request.post(options, (err, res) => {
      if (err) {
        if (err.code === "ETIMEDOUT") {
          cb(new Error('Timed out trying to reach container: ' + err));
          return;
        }
        cb(new Error('Unable to reach container: ' + err));
        return;
      }
      
      if (!res || !res.body) {
        cb(new Error('Empty response from container.'));
        return;
      }

      if (res.body.error) {
        cb(new Error(res.body.error));
        return;
      }

      if (!res.body.results) {
        cb(new Error('No results returned from contaioner.'));
        return;
      }
      
      cb(null, res.body.results);
    });
  }
   
  instance() {
    return this.instance
  }
   
  setHostPort(hostPort) {
    if (hostPort) {
      this.hostPort = hostPort
    }
  }
   
   
  /*
   * Cleans up the resources used by the container.
   */
  cleanup(cb) {
    if (this.cleanedUp === true) {
      return async.nextTick(cb)
    }
    
    const stages = [
      /*
       * Stop the container
       */
      this.instance.stop.bind(this.instance),
      
      /*
       * Remove the container
       */
      this.instance.remove.bind(this.instance, {force: true}),
      
      /*
       * Mark the container as cleaned up
       */
      (next) => {
        this.cleanedUp = true
        async.nextTick(next)
      }
    ];
    
    async.series(stages, cb)
  }
}

module.exports = Container