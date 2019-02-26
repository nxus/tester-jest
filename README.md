# nxus-tester-jest

A test environment for Jest that includes Puppeteer, In-memory MongoDB, Redis, and starting the `nxus-tester` server.

## Config

In your application's `jest.config.js`:
```
module.exports = {
  preset: 'nxus-tester-jest'
}
```

This environment preset will detect and create clean test databases for:
 * MongoDB for each (sails-mongo) storage adapter
 * Redis on a separate port if worker_queue.redis_url is in config, unless REDIS_URL in env
 * ElasticSearch (with a test index on configured host/localhost) if waterline-elasticsearch adapter in config.

*Deprecated* If your project uses searcher/elasticsearch, ~use the preset `nxus-tester-jest/nxus-searcher-preset` instead.~ A test index at `localhost:9200/searcher-jest-test` will be created on setup and deleted on teardown, and configured for the `searcher` storage connection.

You probably want to call `await tester.searcherRefresh()` in your tests after documents are indexed to ensure search has the latest documents.


If you need to specify a custom server script or environment vars for `nxus-tester` `startTestServer`, add `testEnvironmentOptions`:
```
module.exports = {
  testEnvironmentOptions: {server: 'index-test.js', serverEnv: {nxus_storage...: '...'}}
}
```
