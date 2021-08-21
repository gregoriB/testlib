const { PASSED, FAILED, ASSERTIONS, TESTS } = require('./constants');
const { getFunctionParams } = require('./utils');

class TestLib {
    initializeTestData() {
        this.tallies = {
            tests: {
                passed: 0,
                failed: 0
            },
            assertions: {
                passed: 0,
                failed: 0
            }
        }
        this.beforeEachCallbacks = [];
        this.complete = false;
    }

    async getResults() {
        await new Promise(resolve => {
            const testlib = this;
            function resultsPolling() {
                if (testlib.complete === true) {
                    clearInterval(this);
                    resolve();
                }
            }
            setInterval(resultsPolling);
        });
        return { description: this.description, tallies: this.tallies };
    }

    getTestMethods() {
        return {
            assert: new Assert(this).getMethodsWithContext(),
            createSpy: context => new Spy(context),
            beforeEach: this.beforeEach.bind(this),
            test: this.test.bind(this),
            waitFor: this.waitFor,
            fixtureProvider: this.fixtureProvider
        }
    }

    async run(description, fn) {
        this.description = description;
        this.initializeTestData();
        console.logTest(`\nRunning tests for ${description} \n`);
        await fn(this.getTestMethods());
        this.complete = true;
    }

    async test(test, fn) {
        console.logTest(`Test: "${test}"`);
        this.beforeEachCallbacks.forEach(cb => {
            const args = this.getFixtureArgsFromParams(cb);
            cb(...args);
        });
        const prevFailed = this.getTally(ASSERTIONS).failed;
        const args = this.getFixtureArgsFromParams(fn)
        await fn(...args);
        const verdict = prevFailed < this.getTally(ASSERTIONS).failed ? FAILED : PASSED;
        this.incrementTestsTally(verdict);
        if (verdict === FAILED) {
            this.alertTestFailure(test);
        }
    }

    getFixtureArgsFromParams(fn) {
        const fixtures = require('./fixtures');
        const params = getFunctionParams(fn);
        return params.map(param => {
            if (!fixtures.hasOwnProperty(param)) {
                throw new Error(`${param} does not exist as a fixture!`)
            }
            return fixtures[param];
        });
    }

    alertTestFailure(test) {
        console.logTest(`\nALERT: "${test}" TEST HAS FAILED! SEE ABOVE ERROR FOR DETAILS\n`)
    }

    beforeEach(fn) {
        if (typeof fn === 'function') {
            this.beforeEachCallbacks.push(fn);
        }
    }

    fixtureProvider(fn) {
        return function(...args) {
            const params = getFunctionParams(fn);
            const fixtures = require('./fixtures');
            args = params
                .map((_, i) => i < args.length ? args[i] : null)
                .slice(0, params.length - 1);
            args.push(fixtures);
            fn(...args);
        }
    }

    waitFor(fn) {
        return new Promise(fn);
    }

    incrementTally(tally, verdict) {
        this.tallies[tally][verdict]++;
    }

    incrementTestsTally(verdict) {
        this.incrementTally(TESTS, verdict);
    }

    incrementAssertionsTally(verdict) {
        this.incrementTally(ASSERTIONS, verdict);
    }

    getTally(tally) {
        return this.tallies[tally];
    }

    handleAssertionPass() {
        this.incrementAssertionsTally(PASSED);
    }

    handleAssertionFail(error, message) {
        message = message || '\nAssertion Fail';
        console.logAssert(message);
        console.logAssert(error);
        this.incrementAssertionsTally(FAILED);
    }

    logTestResults(results) {
        console.logResult('\n\n=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~= TEST RESULTS =~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=');
        let passed = 0, failed = 0;
        results.forEach(result => {
            const { tests, assertions } = result.tallies;
            passed += tests.passed;
            failed += tests.failed;
            console.logResult(`
                ===== ${result.description} =====
                
                ${tests.passed + tests.failed} TESTS FINISHED

                *
                * ${assertions.passed} Assertions Passed
                * ${assertions.failed} Assertions Failed
                * 
                * ${tests.passed} Tests Passed
                * ${tests.failed} Tests Failed
                * 
            `);
        });
        console.logResult(`\nTOTAL: Passed: ${passed}, Failed: ${failed}`);
        console.logResult('\n=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=\n\n');
    }
}

class Assert {
    constructor(context) {
        this.context = context;
    }

    equal(actual, expected) {
        try {
            if (actual === expected) {
                this.handleAssertionPass();
            } else {
                throw `Expected "${expected}" but instead got "${actual}"`;
            }
        }
        catch(error) {
            this.handleAssertionFail(error);
        }
    }

    notEqual(actual, expected) {
        try {
            if (actual !== expected) {
                this.handleAssertionPass();
            } else {
                throw `Expected "${expected}" to not equal "${actual}"`;
            }
        }
        catch(error) {
            this.handleAssertionFail(error);
        }
    }

    hasExpectedKeys(actual, expected) {
        try {
            for (let key of expected) {
                if (!actual.hasOwnProperty(key)) {
                    throw `"Missing expected property: "${key}"`;
                }
            }
            this.handleAssertionPass();
        } catch(error) {
            this.handleAssertionFail(error, `\nAssertion Fail, Object missing key`);
        }
    }

    hasExpectedValues(actual, expected) {
        try {
            const actualLen = Object.keys(actual).length;
            const expectedLen = Object.keys(expected).length;
            if (actualLen < expectedLen) {
                throw `Missing ${expectedLen - actualLen} properties`;
            }
            if (actualLen !== 0 && expectedLen === 0) {
                throw `Expected an empty object`;
            }
            for (let key in expected) {
                if (!actual.hasOwnProperty(key) || actual[key] !== expected[key]) {
                    throw `"${actual[key]}" does not equal "${expected[key]}"`;
                }
            }
            this.handleAssertionPass();
        } catch(error) {
            this.handleAssertionFail(error, `\nAssertion Fail, Object properties not equal`);
        }
    }

    exists(value) {
        try {
            if (value !== undefined) {
                this.handleAssertionPass();
            } else {
                throw `"${value}" does not exist.`;
            }
        }
        catch(error) {
            this.handleAssertionFail(error);
        }
    }

    doesNotExist(value) {
        try {
            if (value === undefined) {
                this.handleAssertionPass();
            } else {
                throw `Value does exist: ${value}`;
            }
        }
        catch(error) {
            this.handleAssertionFail(error);
        }
    }

    getMethodsWithContext() {
        const { equal, notEqual, hasExpectedKeys, hasExpectedValues, exists, doesNotExist } = this;
        return {
            equal: equal.bind(this.context),
            notEqual: notEqual.bind(this.context),
            hasExpectedKeys: hasExpectedKeys.bind(this.context),
            hasExpectedValues: hasExpectedValues.bind(this.context),
            exists: exists.bind(this.context),
            doesNotExist: doesNotExist.bind(this.context),
        }
    }
}

class Spy {
    constructor(context) {
        this.context = context;
        this.reports = {};
    }

    getReports() {
        return this.reports;
    }

    initializeReport(name) {
        this.reports[name] = {
            args: [],
            returned: [],
            callCount: 0
        }
    }

    updateReport(name, args, returned) {
        const report = this.reports[name];
        this.reports[name] = { 
            args: [...report.args, [report.args.length, args]],
            returned: [...report.returned, [report.returned.length, returned]],
            callCount: report.callCount + 1
        };
    }

    watch(fn) {
        this.initializeReport(fn.name);
        return (...args) => {
            const returned = fn.call(this.context, ...args);
            this.updateReport(fn.name, args, returned);
            return returned;
        }
    }
}

module.exports = TestLib;