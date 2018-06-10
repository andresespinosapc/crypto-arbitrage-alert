### What is this repo for?

This is a very small project that I developed during July 2017, which alerted me when there were arbitrage opportunities between different Ether markets. There were really nice opportunities that month, but they were decreasing with time so I lost interest in the project. In that moment I aimed to make a bot that traded by itself, so there's also code for that in this project, but I dropped it because there decreasing number and magnitude of opportunities.


### Environment variables

Private keys are stored as environment variables. Here is a list of variables you must set:
- *PRIV*: Your Ether wallet's private key.
- *INFURA_TOKEN*: Infura token to use it as RPC server.
- *BITTREX_KEY* and *BITTREX_SECRET*: Bittrex credentials.
- *LIQUI_KEY* and *LIQUI_SECRET*: Liqui credentials.
- *ETHERSCAN_KEY*: Etherscan credentials.
- *IS_DG*: This is not a private key. It is a boolean that I set true if the code was running on DigitalOcean.

**NOTE:** If you find a private key in previous commits, don't worry, I have changed my key for all the services. I know, I shouldn't have ever hardcoded private keys.


### What is each file/directory for?

- *constants.js*: Contains constants that will be specific to you. Here's a list of them:
  - *TELEGRAM_CHAT_ID*: Telegram chat ID to which the alerts will be sent.
  - *TELEGRAM_BOT_TOKEN*: Token of a Telegram Bot which will send the alerts.
  - *LIQUI_DEPOSIT_ADDRS*: A Javascript object where the key is the short-name of a token and the value is address that Liqui gives you to deposit that token.
- *transactor.js*: Exports a module with functions related to token transactions.
- *user_settings*: Directory that contains a global configuration file and configuration files per Telegram ID. To show you an example: I wrote this library with a friend and we could agree on which notifications were important and which didn't, so each one had a custom configuration file.
- *alert_diff.js*: Exports a function that constantly checks if there is a relevant difference between two markets, and sends a message through a Telegram bot based on user settings.
- *bot.js*: Sets up a bot to which you can ask multiple things, like deposit eth to some address, place orders, etc. **This is not well-tested, don't use it without reviewing the code yourself**.
- *websites*: Directory that contains classes to handle operations for multiple exchanges.