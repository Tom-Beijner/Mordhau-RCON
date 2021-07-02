# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5] - 2021-07-02

### Added

-   Added global add/remove admin commands (Totally didn't mark the todo for this as done without adding them)
-   Auto Updater now sends a message every 5 minutes to remind the user to restart the bot after an update have been installed
-   Added a check for some array fields for `config.json` and `bannedWords.json` to only allow unique items

### Changed

-   Moved `bannedWords.json` and migration config.json (which is now named `migration.json`) file to root directory of the project
-   Global punishments (`ban` and `mute`) will now override currently applied punishment duration (though if the player is already permanently banned on a server the player's current duration will not be forced)

### Fixed

-   Fixed dot notation to use correct format (fixes `automod` and config auto `migration`)
-   Fixed naughty message notification being sent to activity instead of wanted channel

## [1.4.1] - 2021-07-01

### Fixed

-   Fixed wrong webhook that was used for punishments (permanent was used)

## [1.4.0] - 2021-06-30

### Added

-   You can now toggle servers to ignore global punishments (using `ignoreGlobalPunishments`)

### Changed

-   Made so all servers run their webhooks as well as you only have to use the channel id, the bot will automatically create its webhooks. This also means you have to give it bot and applications.commands scopes also manage webhooks permission.
-   `config.json` and `example.config.json` has been moved to the root folder ("/") and there's now a validation check

## [1.3.0] - 2021-06-28

### Changed

-   `deletepunishment` now has the ability to delete multiple punishments at once
-   `history` and logged punishments will show ObjectID instead of index ID

### Fixed

-   Fixed some weird typo on `deletepunishment` after deleting a punishment

## [1.2.1] - 2021-06-28

### Changed

-   Auto update will show changelog when an update has been downloaded

## [1.2.0] - 2021-06-28

### Added

-   Added auto update
-   Added update command (which has force update para1meter)
-   Added auto update configuration with an interval in minutes

## [1.1.1] - 2021-06-25

### Fixed

-   Fix RCON error when list responses are too large
-   Kicks now fail when the player isn't in-game

## [1.1.0] - 2021-06-25

### Added

-   Automod is now fully customizable as well as infractions gets saved to the database (restarting the bot wont reset infractions)
-   Added `deletehistory` and `deletepunishment` commands

### Changed

-   Made admin list saving/rollback toggleable and included notify only mode
-   Made RCON command use codeblock

### Removed

-   Removed history suggestion
-   Removed history over 10 offenses history

### Fixed

-   Fixed global punishment commands to not send multiple embeds and not save multiple database documents
