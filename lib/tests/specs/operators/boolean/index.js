import { testSuite } from "manten";
export default testSuite(async ({ describe }) => {
    describe("boolean", async ({ runTestSuite }) => {
        runTestSuite(import("./includes.test.js"));
        runTestSuite(import("./and.test.js"));
    });
});
