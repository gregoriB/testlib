# JS Testing Framework

Very light and limited testing framework.

<br>

## Features

* Automatic running of test files
* Automatic importing of fixtures
* Spy on methods
* Use CLI to Specify which files to test and which console logs to log
* Familiar style to popular frameworks like Jest and Mocha

<br>

## Usage in Nodejs

Run `npm install git://github.com/gregoriB/testlib.git` to install. Import the `TestLib`, create a new instance of it, write your tests, and then export the instance.

Test files should contain `.test.js` in the name.  Fixture files should contain `.fixtures.js`.

To run all tests, execute `npm explore testlib -- npm run tests` in the CLI.  

Specific tests can be run by adding the file name without the extensions
as an argument,
<br>
eg: `npm explore testlib -- npm run tests person`

<br>

### Basic example testing a `Person` class from `/src/tests/person.test.js`:
```js
const Person = require("../person.js");
const TestLib = require("testlib");
const testlib = new TestLib();

testlib.run("Person Class", (tools) => {
    const { test, assert } = tools;

    test("New person instance has correct name", () => {
        const person = new Person("Heisenberg");
        assert.equal(person.getName(), "Heisenberg");
    });
});

module.exports = testlib;
```
Here are an explanation of the tools that are passed into the `tests.run` callback:

```js
/* Accepts a function to run before each test. Can pass in fixture data if the parameter
 * name matches the fixture name.  Multiple `beforeEach` functions can run before each test.
 * ie: beforeEach((fixture1, fixture2) => ...)
 */
beforeEach(Function);

/*
 * Main function for running our test.  Accepts a test description and the actual test in the callback.  
 * Also can pass in fixtures as long as the names match.
 * ie: test("Making sure class method works", (fixture1, fixture2) => { ... });
 */
test(String, Function);

/*
 * Wrapper to pass a fixture object containing all fixture data into any function as the last argument.
 * ie: const doThingWithFixtures = fixtureProvider((arg1, arg2, fixtures) => { ... }));
 * In that example, the 3rd parameter when `doThingWithFixtures` is called would always be the 
 * automatically passed in fixtures object, even when no 1st or 2nd arguments are passed in by the user. 
 * Regardless of how many parameters there are, the last parameter defined should represent the fixtures object.
 */ 
fixtureProvider(Function);

/* assert methods will always accept "actual" for the first argument.
 * ie: assert.equal(actual, expected) 
 */
assert = {
    equal // fn(<primitive>, <primitive>) - Asserts that 2 primitives are equal.
    notEqual, // fn(<primitive>, <primitive>) - Asserts that 2 primitives are not equal
    hasExpectedKeys, // fn(<object>, <array>) - Asserts an object contains all of the keys in a list
    hasExpectedValues, // fn(<object>, <object>) - Asserts an object contains values from a different object
    exists // fn(value) - Asserts that a value is not undefined
    doesNotExist // fn(value) - Asserts that a value is undefined
}

/*
 * Create a new spy instance.  Accepts a class or object to use for context. Then can be used
 * to watch a method or methods on the object, and eventually get a "report" of how they were used.
 * eg: const person = new Person("Mary");
 *     const spy = createSpy(person);
 *     person.getName = spy.watch(person.getName);
 *     person.getName();
 *     // Get reports including call counts, any args used, and the return values for each call.  
 *     // Returns all reports for all watched methods.
 *     const report = spy.getReports(); 
 *     // eg. report = {
 *     //         getName: { 
 *     //             callCount: 1, 
 *     //             args: [[0, []]],  // args and returned values are numbered for quick reference
 *     //             returned: [[0, "Mary"]]
 *     //         } 
 *     //     }
 * 
 */
createSpy(Object);

/*
 * Just a promise wrapper, equivalent to `new Promise(resove => { fn(); resolve(); });
 * Accepts a callback, passes in the `resolve/reject` promise methods.
 * A common practice in testing is to name "resolve" as "done".
 * eg: 
 *   let result = 'FAIL';
 *   await waitFor(done => {
 *       setTimeout(() => {
 *           result = 'PASS';
 *           done();
 *       }, 2000);
 *   });
 *   assert.equal(result, 'PASS');
 */
waitFor(Function);
```
<br>

### CLI Flags

Here is a list of CLI flags that can be run to change console logging behavior:

```js
-no-logs // Disables user input console logs
-no-errors // Disables user input console errors
-no-test-logs // Disables test logs
-no-assert-logs // Disables assertion failure logs
-no-result-logs // Disables the results log(though I don't know why you'd want to do that)
-only-result-logs // Only the results log is shown.  Doesn't show failing test details.
```
eg: `npm explore testlib -- npm run tests person -- -no-logs -no-errors`

<br>

### Asynchronous testing

Async/await is now supported.  Just declare both the `run` and `test` callbacks as asynchronous.

```js
const TestLib = require("testlib");
const testlib = new TestLib();

testlib.run("Async testing", async (tools) => {
    const { test, assert } = tools;

    await test("Waits for the promise to resolve", async () => {
        let result = 'FAIL';
        await new Promise(resolve => {
            setTimeout(() => {
                result = 'PASS';
                resolve();
           }, 1000);
        });
        assert.equal(result, 'PASS');
    });
});

module.exports = testlib;
```
<br>

## Some examples of tests from an actual project

```js
const BlockChain = require('../BlockChain.js');
const Transaction = require('../Transaction.js');
const TestLib = require('testlib');

const testlib = new TestLib();

testlib.run('Blockchain', (tools) => {
    const { test, beforeEach, assert, createSpy, fixtureProvider } = tools;

    let chain;
    let transaction;

    const addTransactionsToPending = (qty = 0, transaction, fixtures = {}) => {
        if (!transaction) {
            const { transactionArgs, walletA } = fixtures;
            transaction = new Transaction(...transactionArgs);
            transaction.sign(walletA);
        }
        for (let i = 0; i < qty; i++) {
            chain.addTransactionToPending(transaction);
        }
    }

    const addTransactionsToPendingWithFixtures = fixtureProvider(addTransactionsToPending);

    // chainArgs, transactionArgs, and walletA come from the fixture data
    // Creates a fresh blockchain and fresh transaction before each test
    beforeEach((chainArgs, transactionArgs, walletA) => {
        chain = new BlockChain(...chainArgs);
        transaction = new Transaction(...transactionArgs);
        transaction.sign(walletA);
    });

    // chainData comes from the fixture data
    test('Creates a new blockchain', (chainData) => {
        const actual = chain.generateChainData();
        assert.hasExpectedValues(actual, chainData);
    });

    // payoutAddress comes from the fixture data
    test('Validates the chain when every block has integritry', (payoutAddress) => {
        addTransactionsToPendingWithFixtures(4);
        chain.minePending(payoutAddress);
        assert.equal(chain.validateAll()[0], true);
    });

    // Example of a "spy" being used to spy on a method
    test('Execute observers when the chain is updated', (payoutAddress) => {
        let counter = 0;
        const spy = createSpy(chain);
        chain.executeObservers = spy.watch(chain.executeObservers);
        chain.subscribe(() => counter++);
        chain.subscribe(() => counter += 5);
        chain.addTransactionToPending(transaction);
        chain.minePending(payoutAddress);
        chain.addTransactionToPending(transaction);
        chain.minePending(payoutAddress);
        const spyReport = spy.getReports()["executeObservers"];
        assert.equal(spyReport.callCount, 2);
        assert.equal(counter, 12);
    });
});

module.exports = testlib;
```