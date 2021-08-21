const TestLib = require('../TestLib');
const testlib =  new TestLib();

testlib.run('Async', async (tools) => {
    const { assert, test, waitFor }  = tools;

    await test('Wait for promise to resolve', async () => {
        let timeout = done => setTimeout(() => done('PASS'), 500);
        let result = 'FAIL';
        result = await waitFor(timeout);
        assert.equal(result, 'PASS');
    });
});

module.exports = testlib;