# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
