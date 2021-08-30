# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.14.1] - 2021-08-30

### Fixed

-   Fixed teleport location minimum value check using wrong variable (used MIN_VALUE but documentation explicitly says "Number.MIN_VALUE is the smallest positive number" (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MIN_VALUE#description), now using Number.MIN_SAFE_INTEGER (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MIN_SAFE_INTEGER))

## [1.14.0] - 2021-08-30

### Added

-   Added all maps message if you didnt provide a existing map name (reponse for `teleportlocations` discord command)
-   Added `timeleft` in-game command

### Fixed

-   Fixed `teleportedit` discord command erroring if there was a command without alias array

## [1.13.3] - 2021-08-29

### Fixed

-   If teleport location didnt have alias then there would be a thrown error

## [1.13.2] - 2021-08-29

### Fixed

-   Only admins should be able to teleport other players

## [1.13.1] - 2021-08-29

### Fixed

-   Teleport system should be inactive by default (example.config.json had it enabled)

## [1.13.0] - 2021-08-29

### Added

-   Added a teleport system (no teleport locations are specified by default)
-   Also added 3 new discord slash commands: `teleportadd`, `teleportremove` and `teleportedit`

### Changed

-   Made ingame commands array could be empty (essentially disabling ingame commands)
-   Moved save admin list to run when keepalive succeeds instead of also running after keepalive error

## [1.12.1] - 2021-08-28

### Fixed

-   Forgot to add a simple check for the mention remove function

## [1.12.0] - 2021-08-28

### Fixed

-   Fixed player names being able to mention (message sent by the bot would mention if the player has a mentionable name)

## [1.11.0] - 2021-08-22

### Added

-   Added auto restarter to the auto updater system

### Fixed

-   Fixed interactions failing by deferring every command (the reason for interactions failing are probably related to some commands taking too long to respond to the interaction. PS: Mystic rekt! 😁)
-   Fixed cancel button not checking who pressed the bot (causing the action being canceled)

## [1.10.2] - 2021-08-11

### Fixed

-   Fixed shouldSave error (rare error?)
-   Fixed threshold bans using mute as console log instead of ban (minor issue)

## [1.10.1] - 2021-08-11

### Fixed

-   Fixed auto update spamming console

## [1.10.0] - 2021-08-11

### Added

-   Discord punishments commands now support `syncServerPunishments`

### Changed

-   Now using [match-sorter](https://www.npmjs.com/package/match-sorter) package to search in-game players (hopefully fixes instances where the bot uses the wrong player, though this new package has not been extensively tested)
-   `syncServerPunishments` and `global` punishments will fallback to sending a punishment message to every punishment webhook (and permanent) if the server is not found in the bot (should be rare)

### Fixed

-   Fixed `syncServerPunishments` causing the bot to crash when punishment is made

## [1.9.1] - 2021-08-08

### Fixed

-   Fixed config doesn't automatically update properly and requiring the user to manually update the configuration

## [1.9.0] - 2021-08-05

### Added

-   Added infinite threshold duration scaling (will not reset warnings after reaching highest threshold, `infiniteDurationScaling` in config for automod and warnings, default: true)
-   Added sync server punishments config setting (currently will not retry to sync if it fails, `syncServerPunishments` in config, default: false)
-   Added `unwarn` command
-   Added `resetwarnnings` command (removes all warnings of a specified player, **only available in Discord**)

### Changed

-   Updated almost all packages
-   Made the automod variables `{name}` and `{words}` available for message and reason
-   Fixed request admin response grammar
-   Steam ID in `lookupplayer` command is now clickable

### Fixed

-   Fixed `ComponentRegisterCallback` import error

## [1.8.0] - 2021-07-28

### Added

-   Added a `warn` command for ingame and Discord slash command, it operates using a infractions threshold (like automod), and with a reset after duration which is for when to remove the infraction. Default being reset after 1 month (the duration is in minutes)
-   Added a webhook logging for `warns`

### Changed

-   Infraction threshold `warn` type has been renamed to `message`
-   Made admin list saving use pastebin if the admin list is too long
-   If a punishment is made by a unauthorized admin then it will try to revert it (currently only bans and mutes are reverted)

## [1.7.0] - 2021-07-09

### Added

-   You can now toggle ingame (RCON) commands

### Changed

-   You can now use the `history` command to see admins' punishments given history (this functionality was previously available when using `deletehistory` and used admin as type)

### Fixed

-   Fixed old typo on the `players` command
-   Fixed typo on history when an global ban was issued, it would say unmuted instead of unbanned

## [1.6.3] - 2021-07-09

### Fixed

-   Fixed duplicate webhook creation while having multiple servers using same channel, webhooks were fetched once and creating one webhook didnt update the fetched webhooks list leading to duplicate webhook creations

## [1.6.2] - 2021-07-06

### Added

-   Added `info` command
-   Added more config checks

### Fixed

-   Fixed killstreak check not working, before it would cause crashes

## [1.6.1] - 2021-07-03

### Fixed

-   Fixed auto updater trying to remove non-existing `bannedWords.json` file (so it doesn't override user version)

## [1.6.0] - 2021-07-02

### Added

-   Added global add/remove admin commands (Totally didn't mark the todo for this as done without adding them)
-   Auto Updater now sends a message every 5 minutes to remind the user to restart the bot after an update have been installed
-   Added a check for some array fields for `config.json` and `bannedWords.json` to only allow unique items

### Changed

-   Moved `bannedWords.json` and migration config.json (which is now named `migration.json`) file to root directory of the project
-   Global punishments (`ban` and `mute`) will now override currently applied punishment duration (though if the player is already permanently banned or muted on a server the player's current duration will not be forced)

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
