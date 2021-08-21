const TestLib = require('../TestLib');
const testlib =  new TestLib();

testlib.run('Async', async (tools) => {
    const { assert, test, waitFor }  = tools;

    await test('waitFor function works', async () => {
        let result = 'FAIL';
        await waitFor(done => {
            setTimeout(() => {
                result = 'PASS';
                done();
            }, 500);
        });
        assert.equal(result, 'PASS');
    });
});

module.exports = testlib;