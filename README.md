# nxus-tester-jest

A test environment for Jest that includes Puppeteer, In-memory MongoDB, and starting the `nxus-tester` server.

## Config

In your application's `jest.config.js`:
```
module.exports = {
  preset: 'nxus-tester-jest'
}
```

If you need to specify a custom server script for `nxus-tester` `startTestServer`, create a file `jest-nxus.config.js`:
```
module.exports = {
  server: 'index-test.js'
}
```

