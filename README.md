<h1 align="center">
    Mordhau RCON
    <br />
</h1>

<h4 align="center">RCON, Moderation, Logging and Modular.</h4>

<p align="center">
  <a href="#overview">Overview</a>
  •
  <a href="#prerequisites">Prerequisites</a>
  •
  <a href="#installation">Installation</a>
  •
  <a href="#migration">Migration</a>
  •
  <a href="#ingame-commands">Ingame Commands</a>
  •
  <a href="#to-do">To Do</a>
  •
  <a href="#author">Author</a>
  •
  <a href="#contributing">Contributing</a> 
  •
  <a href="#license">License</a>
</p>

## Overview

A Discord bot that utilizes RCON for the Mordhau server and logs punishments with extra features. It makes use of [Slash Commands](https://discord.com/developers/docs/interactions/slash-commands) and has in-game commands. As this is version 2 of AssaultLine's [Mordhau Ban Logger](https://github.com/academy-gaming/mordhaubanlogger) a migration feature has been added. The bot is semi-modular, some features can be toggled on, off, or customized (like killstreaks). The bot is self-hosted so you need to host the bot on your server.

### Notices

You can only have a maximum of 25 servers (not that you will have that many) as this is a limitation of Discord\'s Slash Commands.

#### Commands

For setting discord role commands access

```
ban
banned
deletehistory
deletepunishment
globalban
globalmute
globalunban
globalunmute
history
kick
mute
rename
say
unban
unmute
addadmin
removeadmin
rcon
update
```

### Features

-   Per-server punishments saving (You can customize each server to save specific punishment types or just disable it altogether)
-   Killstreaks (You can toggle this feature, as well as a toggle to count bot kills for each server and customize it, for each kill threshold with its message. The available variables are `{name}` and `{kills}`)
-   Automod (Currently a hardcoded threshold is in place but you can define which words should be forbidden in the `bannedWords.json` file located in the `locales` directory)
-   Admin list saving/rollback (Toggleable feature with notify only mode)

## Prerequisites

-   [Node.js](https://nodejs.org/) (preferably the latest LTS version).
-   You need to create a MongoDB cluster, you can get one free on MongoDB Atlas, follow the [official guide](https://docs.atlas.mongodb.com/getting-started/) from part 1 to part 4.
-   [Steam API Key](https://steamcommunity.com/dev/apikey).
-   Setup RCON on the Mordhau server.

## Installation

1. Clone the repository
2. Copy `example.config.json` file (located in `src` as well as in `src/migration` directories) as `config.json` and edit the values
3. Install the required dependencies: `npm install` or `yarn install`
4. Build the bot: `npm run build` or `yarn build`
5. Start the bot `npm run start` or `yarn start`

## Migration

To migrate from the [Mordhau Ban Logger](https://github.com/academy-gaming/mordhaubanlogger) copy-paste the save folder to `dist/migration` (maybe change the files' name to the new desired server name, note: all underscores ("\_") becomes spaces (" ")) and run `npm run migrate` or `yarn migrate`

## Ingame Commands

`<>` - Required
`[]` - Optional

### General

| Command           | Description                          | Usage                    | Example              |
| ----------------- | ------------------------------------ | ------------------------ | -------------------- |
| Killstreak        | Get a player's killstreak            | killstreak [player name] | killstreak Schweppes |
| HighestKillstreak | Get the current match top killstreak | highestkillstreak        | highestkillstreak    |
| RequestAdmin      | Request for a admin                  | requestadmin [message]   | requestadmin FFA!    |

### Admin

| Command | Description     | Usage                                                            | Example                                   |
| ------- | --------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| Ban     | Ban a player    | ban <player name/id> [--duration/-d number] [--reason/-r string] | ban Schweppes --duration 100 --reason FFA |
| Kick    | Kick a player   | kick <player name/id> [--reason/-r string]                       | kick Schweppes --reason FFA               |
| Mute    | Mute a player   | mute <player name/id> [--duration/-d number]                     | mute Schweppes --duration 100             |
| Unban   | Unban a player  | unban <player id>                                                | unban Schweppes                           |
| Unmute  | Unmute a player | unmute <player name/id>                                          | unmute Schweppes                          |

## To Do

-   [x] Fix global punishment commands to use one embed and one database documents
-   [x] Global addadmin/removeadmin commands
-   [x] Clear system for players and admins
-   [x] Add confirmation system, like reactions for global and clear system
-   [x] Make admin list saving/rollback toggleable as well as only notify mode
-   [x] Make automod customizable

## Changelog

### v1.1.0

-   Automod is now fully customizable as well as infractions gets saved to the database (restarting the bot wont reset infractions)
-   Added `deletehistory` and `deletepunishment` commands
-   Fixed global punishment commands to not send multiple embeds and not save multiple database documents
-   Made admin list saving/rollback toggleable and included notify only mode
-   Made RCON command use codeblock
-   Removed history suggestion
-   Removed history over 10 offenses history

## Author

**Tom Beijner**

-   GitHub: [@Tom-Beijner](https://github.com/Tom-Beijner)
-   LinkedIn: [@Tom-Beijner](https://www.linkedin.com/in/tom-beijner/)

## Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check [issues page](https://github.com/Tom-Beijner/Mordhau-RCON/issues).

## Show your support

Please ⭐️ this repository if this project helped you!

## License

Copyright © 2021 [Tom Beijner AKA Schweppes](https://tombeijner.com).
This project is [MIT](https://github.com/Tom-Beijner/Mordhau-RCON/blob/master/LICENSE) licensed.
