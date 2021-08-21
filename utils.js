const fs = require('fs');
const path = require('path');

/*
 * Apply flags input in the command line.  eg: "-no-logs" disables all user
 * input console logs.
 */
function applyFlags(args) {
    const flags = args.filter(arg => arg.includes('-'));
    const methods = {
        '-no-logs': () => disableConsoleMethod('log'),
        '-no-errors': () => disableConsoleMethod('error'),
        '-no-test-logs': () => disableConsoleMethod('logTest'),
        '-no-assert-logs': () => disableConsoleMethod('logAssert'),
        '-no-result-logs': () => disableConsoleMethod('logResult'),
        '-only-result-logs': () => {
            ['log',
             'error',
             'logTest',
             'logAssert'].forEach(disableConsoleMethod);
        }
    }
    flags.forEach(flag => methods[flag]?.()); 
}

function disableConsoleMethod(method) {
    console[method] = function() {};
}

/*
 * Create special console log methods to be used automatically
 * by the test framework. 
 */
function setCustomLogs() {
    const log = console.log;
    console.logAssert = log;
    console.logResult = log;
    console.logTest = log;
}

/*
 * Recursively walk from the root directly and build a list of files
 * that match a regular expression.
 */
function findMatchingFiles(regex, dir = path.resolve('')) {
    const skips = ['node_modules', '.git', 'testlib'];
    const files = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        const isDirectory = fs.lstatSync(fullPath).isDirectory();
        const isSkipped = skips.some(skip => file.match(new RegExp(skip)));
        if (isDirectory && !isSkipped) {
            const result = findMatchingFiles(regex, fullPath);
            files.push(result)
            files.flat();
        } else if (!isDirectory && file.match(regex)) {
            files.push(fullPath)
        }
    });
    return files.flat();
}

function formatFixtureImports(files) {
    const fixtures = files.map(file => require(file));
    return fixtures.reduce((obj, curr) => {
        obj[curr] = curr;
        return { ...obj, ...curr}
    }, {});
}

function getFixtureData() {
    const fixturesRe = /.fixtures.js/;
    const files = findMatchingFiles(fixturesRe);
    return formatFixtureImports(files);
}

/*
 * Gets the test results from the test files.  Filters by test file name 
 * args input in the command line, eg: "blockchain"
 */
async function getTestResults(args) {
    args = args.filter(arg => !arg.includes('-'));
    const testRe = /.test.js/;
    let testFiles = findMatchingFiles(testRe);

    if (args.length) {
        testFiles = testFiles.filter(file => args.some(arg => {
            arg = `${arg}.test.js`.toLowerCase();
            // Get only full file name without path
            const fileSplit = file.split('\\');
            const isMatch = arg === fileSplit[fileSplit.length - 1].toLowerCase();
            return isMatch;
        }));
    }
    let results = [];
    for (let file of testFiles) {
        const tests = require(file);
        const result = await tests.getResults();
        results.push(result); 
    }
    return results;
}

/*
 * Get an array of params that were assigned to a function.
 */
function getFunctionParams(fn) {
    const fnStr = fn.toString();
    let open = fnStr.indexOf('(');
    let close = fnStr.indexOf(')');
    if (close === open + 1) {
        return [];
    }
    // If is arrow function without parenthesis around parameter
    if (open !== 0 && (fnStr.slice(0, 8) !== 'function' && fnStr.slice(0, 6) !== 'async ')) {
        open = 0;
        close = fnStr.indexOf('>') - 2;
    }
    return fnStr
        .slice(open, close)
        .replace(/[\s()]/g, '')
        .split(',')
        .filter(item => item !== '');
}

module.exports = {
    getFixtureData,
    applyFlags,
    setCustomLogs,
    getTestResults,
    getFunctionParams
};