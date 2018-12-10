var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var child_process = require('child_process');
var _ = require('underscore');

var app = express();

var port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
	if (!req.body.code
      || !req.body.lang
      || !req.body.timeoutMs
      || !req.body.testCases) {
    res.status(400);
    res.end(JSON.stringify({
      results: [],
      error: 'Must pass code, lang, timeoutMs, and testCases.'
    }));
    return;
	}

  if (req.body.lang == 'python') {
    const results = [];
    testCaseRecurse(
        results,
        0 /* testCaseIndex */,
        req.body.testCases,
        pythonTestCase,
        req.body.code,
        req.body.timeoutMs).then(() => {
          res.end(JSON.stringify({
            results: results,
            error: null
          }));
        });
    return;
  }

  res.end(JSON.stringify({
    results: [],
    error: 'Unknown language: ' + req.body.lang
  }));
});

function testCaseRecurse(
    results, testCaseIndex, testCases, testCaseFn, code, timeoutMs) {
  if (testCaseIndex >= testCases.length) {
    return Promise.resolve();
  }

  return testCaseFn(testCaseIndex, testCases[testCaseIndex], code, timeoutMs)
      .then(result => {
        results.push(result);
        if (!result.passed) {
          return Promise.resolve();
        }
        return testCaseRecurse(
            results, testCaseIndex + 1, testCases, testCaseFn, code, timeoutMs);
      });
}

function pythonTestCase(testCaseIndex, testCase, code, timeoutMs) {
  return new Promise(function(resolve, reject) {
    const testCode = fs.readFileSync('./test.py');
    const codeFilename = './code' + testCaseIndex + '.py';
    fs.appendFileSync(codeFilename, code + '\n' + testCode);

    var stdout = '';
    var stderr = '';
    var params = ['-u', codeFilename];
    for (var i = 0; i < testCase.params.length; i++) {
      params.push(testCase.params[i].value);
      params.push(testCase.params[i].type);
    }
    var job = child_process.spawn('python', params, {cwd: __dirname})
    
    job.stdout.on('data', function (data) {
      stdout += data;
    })
    job.stderr.on('data', function (data) {
      stderr += data;
    })

    var timeoutCheck = setTimeout(function() {
      job.kill('SIGKILL');
      resolve({
        testCase: testCase,
        passed: false,
        error: 'Time limit exceeded: ' + timeoutMs + ' ms'
      });
    }, timeoutMs)
    
    job.on('close', function() {
      if (stderr && stderr.length) {
        resolve({
          testCase: testCase,
          passed: false,
          error: stderr
        });
        return;
      }

      var tokens = stdout.split(' ');
      if (tokens[0] != testCase.expected.type) {
        resolve({
          testCase: testCase,
          passed: false,
          error: 'Wrong answer type. Expected ' + testCase.expected.type
              + ', got ' + tokens[0]
        });
        return;
      }
      const ans = tokens.slice(1).join(' ');
      if (ans != testCase.expected.value) {
        resolve({
          testCase: testCase,
          passed: false,
          error: 'Wrong answer. Expected ' + testCase.expected.value + ', got '
              + stdout
        });
        return;
      }
      clearTimeout(timeoutCheck);
      resolve({
        testCase: testCase,
        passed: true,
        error: null
      });
    });
  });
}

app.listen(port, function () {
	console.log('Container service running on port ' + port);
});