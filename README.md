# nxus-tester-jest

A test environment for Jest that includes Puppeteer, In-memory MongoDB, and starting the `nxus-tester` server.

## Config

In your application's `jest.config.js`:
```
module.exports = {
  preset: 'nxus-tester-jest'
}
```

If your project uses searcher/elasticsearch, use the preset `nxus-tester-jest/nxus-searcher-preset` instead. A test index at `localhost:9200/searcher-jest-test` will be created on setup and deleted on teardown, and configured for the `searcher` storage connection.


If you need to specify a custom server script or environment vars for `nxus-tester` `startTestServer`, add `testEnvironmentOptions`:
```
module.exports = {
  testEnvironmentOptions: {server: 'index-test.js', serverEnv: {nxus_storage...: '...'}}
}
```
