"use strict";

let _ = require('lodash')

class Job {
    constructor(code, lang, timeoutMs, testCases, cb) {
        this.code = code
        this.lang = lang
        this.timeoutMs = timeoutMs
        this.testCases = testCases
        this.cb = cb || _.noop
    }
}

module.exports = Job