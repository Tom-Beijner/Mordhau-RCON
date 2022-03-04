# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.27.4](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.27.3...v1.27.4) (2022-03-04)


### Bug Fixes

* not logging username automod check ([f804bb9](https://github.com/Tom-Beijner/Mordhau-RCON/commit/f804bb90744795d811f76e4534400d4dfddb64ac))

### [1.27.3](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.27.2...v1.27.3) (2022-03-04)


### Bug Fixes

* a trim issue ([8288c60](https://github.com/Tom-Beijner/Mordhau-RCON/commit/8288c60acd3bf770cd2b00936fed9ac7958bf1e3))

### [1.27.2](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.27.1...v1.27.2) (2022-03-04)


### Bug Fixes

* accidentally ported too much code ([249dfd3](https://github.com/Tom-Beijner/Mordhau-RCON/commit/249dfd305ceca280337dc224d484ba2225fcd04e))

### [1.27.1](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.27.0...v1.27.1) (2022-03-04)


### Bug Fixes

* slight bug with null ([3572cf3](https://github.com/Tom-Beijner/Mordhau-RCON/commit/3572cf3444ce104ac3aa355aacdbf05eb0fb4d47))

## [1.27.0](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.26.0...v1.27.0) (2022-03-04)


### Features

* **automod:** username check for banned words ([f5fb10a](https://github.com/Tom-Beijner/Mordhau-RCON/commit/f5fb10a9ee7a01b3117579e58196eb422ed5a2f9))


### Bug Fixes

* parsing issue (brackets, a port from another project) ([c66a2b8](https://github.com/Tom-Beijner/Mordhau-RCON/commit/c66a2b84b9c86f2ca3b2c02c32f72bf4fba53cc1))

## [1.26.0](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.25.1...v1.26.0) (2022-01-24)


### Features

* make the status embed use cache data to hopefully prevent ? replaced symbols ([be42789](https://github.com/Tom-Beijner/Mordhau-RCON/commit/be427898ccf8340b72291912ed5321f8343ab522))


### Bug Fixes

* matchstate spam ([ea08e25](https://github.com/Tom-Beijner/Mordhau-RCON/commit/ea08e25730b9ff336ad801c749620973679b06c6))

### [1.25.1](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.25.0...v1.25.1) (2021-11-30)


### Bug Fixes

* temp fix, disable admin chat messages, no punishment announcements will be sent ([9497818](https://github.com/Tom-Beijner/Mordhau-RCON/commit/94978182fed12db9c23dbe6633ab6743b313a18e))

## [1.25.0](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.24.0...v1.25.0) (2021-11-24)


### Features

* add adminchat rcon message type ([bd23d77](https://github.com/Tom-Beijner/Mordhau-RCON/commit/bd23d779879cd0f4906bdd9649b2b603160e9f19))
* announce punishments to adminchat ([d111edd](https://github.com/Tom-Beijner/Mordhau-RCON/commit/d111eddb82e6e7d70672c40225455475329ba123))
* match state now gets logged to activity channel (1 small bug is present) ([8fe66df](https://github.com/Tom-Beijner/Mordhau-RCON/commit/8fe66dfdda58cea5c4ba36458e7b09cbaf6f5c89))
* status embed playerlist is now dynamic length check ([9a26ecb](https://github.com/Tom-Beijner/Mordhau-RCON/commit/9a26ecb32289b28f128a224f97eed11411f15fc4))


### Bug Fixes

* **adminactions:** fix a small plural bug ([ca68f3f](https://github.com/Tom-Beijner/Mordhau-RCON/commit/ca68f3f2eb9c85da00d01c71d4051d11ae48f455))
* **adminactions:** potential font fix ([9a9d081](https://github.com/Tom-Beijner/Mordhau-RCON/commit/9a9d081631aa29a34ad2bdc3a22ffcac2013375e))
* fix a bug where if duration was null it would not be able to print out a history message ([774afdc](https://github.com/Tom-Beijner/Mordhau-RCON/commit/774afdc26c31c77fdbad1572bcae221786f775dd))
* remove punishment announcement for kicks and mute, to avoid duplicated messages ([8ef4e5f](https://github.com/Tom-Beijner/Mordhau-RCON/commit/8ef4e5f048cfd2790ffa009b77deb1c59a80178f))

## [1.24.0](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.23.0...v1.24.0) (2021-11-16)


### Features

* the bot won't send the same message in same channel (for punishments and addadmin/removeadmin) ([1641aec](https://github.com/Tom-Beijner/Mordhau-RCON/commit/1641aec9a603f92285cafd8244ab795af37999ae))


### Bug Fixes

* fix player search in-game chat ([da1ec8c](https://github.com/Tom-Beijner/Mordhau-RCON/commit/da1ec8cb0ac825425f6b8a5c7ff1695a420caf34))
* **pm2:** potential fix for pm2 issue ([ae35bc7](https://github.com/Tom-Beijner/Mordhau-RCON/commit/ae35bc7f9d231eb3cc480308785f00ce812c4db4))
* revert pm2 ([b0489a4](https://github.com/Tom-Beijner/Mordhau-RCON/commit/b0489a4ccb9166c183c6c4531cae7482a3e3e21d))

## [1.23.0](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.22.0...v1.23.0) (2021-11-15)


### Features

* make in-game commands ban and mute require a duration to prevent no prefix accidents ([7f9bd52](https://github.com/Tom-Beijner/Mordhau-RCON/commit/7f9bd52da6aa214c8b9e07203bb43f5fa39c313c))
* punishments are now announced (also goes for global punishments) ([47a247a](https://github.com/Tom-Beijner/Mordhau-RCON/commit/47a247aad4a18618cde859b884cae4f886554a43))
* **rcon:** toggle broadcast events by comparing the default provided from the server ([64dc626](https://github.com/Tom-Beijner/Mordhau-RCON/commit/64dc62685b61ef9fe394bf6a1d9d7ee3372f732b))


### Bug Fixes

* fix a bug where total duration would say NaN (for punishments log and history command) ([02338b9](https://github.com/Tom-Beijner/Mordhau-RCON/commit/02338b949722e59acc4a4828a65dca49d65a572c))
* fix a bug where you wouldn't be able to punish a player who's not in the server with their ID ([fbbcede](https://github.com/Tom-Beijner/Mordhau-RCON/commit/fbbcede564fc798ea297179a2c00df7ba973f170))
* small bug if like a permanent mute as issued there would be a space after ([f1cb5e2](https://github.com/Tom-Beijner/Mordhau-RCON/commit/f1cb5e2cdf16e7ac6d10ff25062382acfc86f675))

## [1.22.0](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.21.0...v1.22.0) (2021-11-13)


### Features

* added padding to the player list in status embed to keep the layout structure ([c57342f](https://github.com/Tom-Beijner/Mordhau-RCON/commit/c57342fc3b3ff1d16a9cdaa73653e922e00e1f46))
* **adminActions:** added the ability to see punishments and types. also fixed a small bug ([acb2f42](https://github.com/Tom-Beijner/Mordhau-RCON/commit/acb2f420fed530aa3a34605498182648950f72b9))


### Bug Fixes

* **adminactions:** a graph would generate even if theres not valid command and is all servers ([83f46fa](https://github.com/Tom-Beijner/Mordhau-RCON/commit/83f46fa1a63e9dc98ed3da760e780f62c24fc42f))
* **adminactions:** fix a bug where if a server name or command has a space it would break the embed ([3ab3120](https://github.com/Tom-Beijner/Mordhau-RCON/commit/3ab3120067b8c33dfbb0e8d995da073698ac849b))
* **adminactions:** fix a bug where the list of commands would show each occurrance ([1941e9b](https://github.com/Tom-Beijner/Mordhau-RCON/commit/1941e9bd4f8e54a4b4fcb712bce3d93eaa96d646))
* **adminactions:** fix the sorting of admins to be usage then alphabetically sorted ([d929343](https://github.com/Tom-Beijner/Mordhau-RCON/commit/d92934368c5e64fab09e9ff7f278022b88bc4ef3))
* **adminactions:** rely on fetching directly from the stats file ([1acdf52](https://github.com/Tom-Beijner/Mordhau-RCON/commit/1acdf522f0908cb1f9bc5663721f8f533dc27f56))
* **adminactions:** remove double usage word ([2782f39](https://github.com/Tom-Beijner/Mordhau-RCON/commit/2782f3963b634aea974ce37c39ace1bd3b169d17))
* **autoupdater:** fix changelog not showing properly ([545403b](https://github.com/Tom-Beijner/Mordhau-RCON/commit/545403bc74dfae13b0c6c3c852d685b3e638707f))
* **status:** fix a bug where the status embed wouldnt show the server, might also fixed embed crash ([5712429](https://github.com/Tom-Beijner/Mordhau-RCON/commit/5712429ca6f26542639d7350ffbf33d27dcc7849))
* **teleportadd:** fix a bug where it wouldnt allow you to add a location ([80d4439](https://github.com/Tom-Beijner/Mordhau-RCON/commit/80d443973605a42ec7436744773ed33dcd9881a1))
* **teleportlocations:** y value was returned instead of z ([1ad115f](https://github.com/Tom-Beijner/Mordhau-RCON/commit/1ad115f1661b7b8a5bb2ccfc1bf4977cf4175c1d))

## [1.21.0](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.20.10...v1.21.0) (2021-11-03)


### Features

* added adminactions command (has been existing for a short while, it just got fixed to work) ([64cedd4](https://github.com/Tom-Beijner/Mordhau-RCON/commit/64cedd49a6b3126e8fe0a4db5a628f42bf8f7f5c))
* added server down notification ([5df9f64](https://github.com/Tom-Beijner/Mordhau-RCON/commit/5df9f646931d5563e6c6223aba4e8e342f98c9ec))


### Bug Fixes

* adminactions not considering that there might not be any saved commands ([5f6c32d](https://github.com/Tom-Beijner/Mordhau-RCON/commit/5f6c32d807cb08b3c7677786fdafef37e652bd10))
* **adminactions:** calculation bug fix (accidentally calculated total command usage of each admin) ([256b0de](https://github.com/Tom-Beijner/Mordhau-RCON/commit/256b0debf84d88da80764ffef2452b56b3897e53))
* fix a issue where if stats object was missing from the config it would crash the bot ([fe3a3b9](https://github.com/Tom-Beijner/Mordhau-RCON/commit/fe3a3b946a45ae256a9c74d01a56f04302dd65a3))
* fix when interaction fails to not crash the bot ([8f80a4e](https://github.com/Tom-Beijner/Mordhau-RCON/commit/8f80a4e09f4ca2c131b141f359997cef53a32e8e))

### [1.20.10](https://github.com/Tom-Beijner/Mordhau-RCON/compare/v1.1.1...v1.20.10) (2021-11-01)

## [1.20.9] - 2021-10-31

### Fixed

-   Fixed a wrong order of execution, leading to the bot crashing on startup

## [1.20.8] - 2021-10-29

### Added

-   Added `teleportwith` in-game command to teleport with a player

## [1.20.7] - 2021-10-29

### Fixed

-   Fixed a bug where using the kill slash-command it would say the in-game message in Discord instead of in the server
-   Fixed the kill commands to use correct RCON command

## [1.20.6] - 2021-10-29

### Fixed

-   Forgot to add the `kill` to the in-game commands array

## [1.20.5] - 2021-10-29

### Added

-   Added kill slash-command and in-game coommand (admins only)

### Changed

-   Changed the package that searches for in-game players, might fix the issue of teleporting wrong player (also added a weight for the ID to be prioritize over the name)

### Fixed

-   Fix in-game punishment commands not working with Steam/PlayFab IDs

## [1.20.4] - 2021-10-29

### Changed

-   Made status embed use Math.floor / Math.ceil to avoid rounding errors

### Fixed

-   Fix in-game commands array not being recognized properly to disable/enable commands

## [1.20.3] - 2021-10-29

### Fixed

-   Maybe fix the teleport command

## [1.20.2] - 2021-10-29

### Fixed

-   Fixed teleport permissions bug

## [1.20.1] - 2021-10-29

### Changed

-   Moved the footer info of status embed to the description to be able to use the built-in date feature for client-based timezones (the footer section doesnät allow the usage of markdown).

### Fixed

-   Fixed teleport command to properly work with teleporting other players with location and coordinates (coordinates was broken before, even without specifying a player it would teleport the first player in the playerlist)

## [1.20.0] - 2021-10-26

### Added

-   Added support for running the bot on multiple Discord servers

### Changed

-   Removed `discord.guildId` config value (this should be auto removed when you start the bot)

### Fixed

-   Fixed a bug where if multiple servers were used then the `admins` command would error if a admin did not join all the servers.

## [1.19.6] - 2021-10-22

### Fixed

-   Fixed `mapvote` total votes message before initiating the real vote sending the list of players instead of the count of players
-   Fixed the `admins` to only show the real admins (this also improved the performance of the command)
-   Fixed the `lookupplayer` command to properly handle in-game players and output a response instead of leaving the message on thinking

## [1.19.5] - 2021-10-21

### Added

-   Server status now uses the timezone config value
-   `admins` command now uses the timezone config value
-   `admins` command will now show accurate last time an admin was seen and if they're online

### Fixed

-   Fixed the timezone config value not correctly being used, the logging now shows the correct time based on the timezone config value

### Change

-   More optimization of the performance of `admins` command

## [1.19.4] - 2021-10-20

### Change

-   Optimize the performance of `admins` command

## [1.19.3] - 2021-10-20

### Fixed

-   Remove adminActivity file

## [1.19.2] - 2021-10-20

### Fixed

-   Forgot to update .gitignore

## [1.19.1] - 2021-10-20

### Fixed

-   Forgot to update the `example.config.json` file
-   Forgot to make use of saveAdminActivity config value
-   Fix misspelled `saveAdminActivity`

## [1.19.0] - 2021-10-20

### Added

-   Added the ability to choose own console log timezone (Default: Host timezone)
-   Added `admins` slash command (Default: Only admins) which displays all admins (on a specified server) with their playtime and use any past days (Default: 14 days)

## [1.18.7] - 2021-10-09

### Fixed

-   Fixed a bug where a player could initiate map voting by continuing to use the `mapvote` command

## [1.18.6] - 2021-10-08

### Fixed

-   Fixed map vote system enabled message being sent when it's disabled

## [1.18.5] - 2021-10-08

### Changed

-   Made the `votemap` command only work after match start
-   If a map number that isn't valid, like a letter, it will return a wrong usage message

### Fixed

-   Fixed `initialDelay` of mapvote system to be used

## [1.18.4] - 2021-10-06

### Fixed

-   Properly handle the votemap and cancelmapvote commands based if the map voting feature is enabled

## [1.18.3] - 2021-10-06

### Added

-   Added info about the map vote feature in the README file

### Changed

-   The map vote message also has the command usage now

### Fixed

-   Fixed an issue where if the player left the vote wouldn't be removed
-   Fixed a bug where 2 messages would be sent when canceling a map vote

## [1.18.2] - 2021-10-05

### Fixed

-   You could vote infinite amounts of time and it would count each one of them as a new vote

## [1.18.1] - 2021-10-05

### Fixed

-   Toggling `mapVote` option should enable/disable the in-game commands `votemap` and `cancelmapvote`

## [1.18.0] - 2021-10-05

### Added

-   Added mid-match map voting command, `votemap`. This introduces new config options (see `example.config.json`).
-   Added `cancelmapvote` for admins to cancel a map vote.

## [1.17.0] - 2021-09-28

### Added

-   Added logging to files (currently hardcoded settings like max 14 days of logs and max 20MB size per log file)

### Fixed

-   Might have fixed messages not being deleted, the bot requires to manage messages and sets its permissions to the appropriate channels

## [1.16.10] - 2021-09-28

### Fixed

-   Hopefully fixed the location issue

## [1.16.9] - 2021-09-26

### Added

-   Added passwordProtected fallback value for the status embed

### Fixed

-   Fixed server name fallback not being used properly (also shows the password-protected status fallback)

## [1.16.8] - 2021-09-26

### Added

-   Added fallback values for the server name (this does allow for all characters to be used), server port (game port), and max player count (check the `example.config.json` file for the structure). These are only used when the server can't be found because of the server name having a symbol or just offline (Note: the worst-case scenario is when the server is offline and the embed status just got generated, then only the location data will be correct, the rest will show "Unknown")

### Changed

-   If RCON connection can't be made to the server, the bot will not make a request to the PlayFab API (saves computing resources)

### Fixed

-   Fixed status embed erroring when the server has a symbol in the name (uses fallback values instead, if they're provided)
-   Fixed location falling back to wrong value (supposed to fallback to United Nations flag but fell back to Unknown)

## [1.16.7] - 2021-09-21

### Fixed

-   Fixed flag country not being in lowercase, breaking the flag

## [1.16.6] - 2021-09-21

### Changed

-   Made status embed next update string be the same string as the last update and show time distance

### Fixed

-   Fixed unknown location using unknown flag instead of United Nations flag

## [1.16.5] - 2021-09-21

### Fixed

-   Duplicate interval update strings were used in the status embed footer

## [1.16.4] - 2021-09-21

### Fixed

-   Using server hostname to determine if the server is the same (fixes the optimization that only worked if the status config was on show IP-PORT mode)
-   Display correct location (to not show a rate-limited message)
-   Some grammar issues in changelog (no I will not update the releases' descriptions)

## [1.16.3] - 2021-09-20

### Changed

-   Different approach when sending a new status message (to avoid duplication)
-   Only fetch the location with the API when the server config IP doesn't match the PlayFab API fetched server IP
-   Might have optimized when the bot should fetch new country data for the status message

## [1.16.2] - 2021-09-19

### Added

-   Added status channel permission set (requires the bot to have the manage channel permission)

### Changed

-   The bot will now remove all status messages and send new ones at launch

### Fixed

-   Probably fixed status message being sent again (new system)

## [1.16.1] - 2021-09-11

### Added

-   Added embed color to server status

### Fixed

-   Fixed server-status player list is too long, it's now going to be sent to paste.gg

## [1.16.0] - 2021-09-11

### Added

-   Added server status (check the `example.config.json`)

### Changed

-   With the `players` command each server now has a player count
-   Each config setting now has a default value

## [1.15.0] - 2021-09-04

### Changed

-   Upgraded slash-create library to 4.0.1
-   Made client initialized log after loading all commands

## [1.14.1] - 2021-08-30

### Fixed

-   Fixed teleport location minimum value check using a wrong variable (used MIN_VALUE but documentation explicitly says "Number.MIN_VALUE is the smallest positive number" (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MIN_VALUE#description), now using Number.MIN_SAFE_INTEGER (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MIN_SAFE_INTEGER))

## [1.14.0] - 2021-08-30

### Added

-   Added all maps message if you didn't provide an existing map name (response for `teleportlocations` discord command)
-   Added `timeleft` in-game command

### Fixed

-   Fixed `teleportedit` discord command erroring if there was a command without alias array

## [1.13.3] - 2021-08-29

### Fixed

-   If teleport location didn't have an alias then there would be a thrown error

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

-   Made in-game commands array could be empty (essentially disabling in-game commands)
-   Made save admin list function to run when keepalive succeeds instead of also running after keepalive error

## [1.12.1] - 2021-08-28

### Fixed

-   Forgot to add a simple check for the mention remove function

## [1.12.0] - 2021-08-28

### Fixed

-   Fixed player names being able to mention (message sent by the bot would mention if the player has a mentionable name)

## [1.11.0] - 2021-08-22

### Added

-   Added auto restarter to the auto-updater system

### Fixed

-   Fixed interactions failing by deferring every command (the reason for interactions failing are probably related to some commands taking too long to respond to the interaction. PS: Mystic rekt! 😁)
-   Fixed cancel button not checking who pressed the bot (causing the action being canceled)

## [1.10.2] - 2021-08-11

### Fixed

-   Fixed shouldSave error (rare error?)
-   Fixed threshold bans using mute as console log instead of a ban (minor issue)

## [1.10.1] - 2021-08-11

### Fixed

-   Fixed auto-update spamming console

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

-   Added infinite threshold duration scaling (will not reset warnings after reaching the highest threshold, `infiniteDurationScaling` in the config for automod and warnings, default: true)
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

-   Added a `warn` command for in-game and Discord slash command, it operates using an infractions threshold (like automod), and with a reset after duration which is for when to remove the infraction. The default being reset after 1 month (the duration is in minutes)
-   Added a webhook logging for `warns`

### Changed

-   Infraction threshold `warn` type has been renamed to `message`
-   Made admin list saving use Pastebin if the admin list is too long
-   If punishment is made by an unauthorized admin then it will try to revert it (currently only bans and mutes are reverted)

## [1.7.0] - 2021-07-09

### Added

-   You can now toggle in-game (RCON) commands

### Changed

-   You can now use the `history` command to see admins' punishments given history (this functionality was previously available when using `deletehistory` and used admin as type)

### Fixed

-   Fixed old typo on the `players` command
-   Fixed typo on history when a global ban was issued, it would say unmuted instead of unbanned

## [1.6.3] - 2021-07-09

### Fixed

-   Fixed duplicate webhook creation while having multiple servers using the same channel, webhooks were fetched once, and creating one webhook didn't update the fetched webhooks list leading to duplicate webhook creations

## [1.6.2] - 2021-07-06

### Added

-   Added `info` command
-   Added more config checks

### Fixed

-   Fixed killstreak check not working before it would cause crashes

## [1.6.1] - 2021-07-03

### Fixed

-   Fixed auto-updater trying to remove non-existing `bannedWords.json` file (so it doesn't override user version)

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

-   `deletepunishment` now can delete multiple punishments at once
-   `history` and logged punishments will show ObjectID instead of index ID

### Fixed

-   Fixed some weird typo on `deletepunishment` after deleting a punishment

## [1.2.1] - 2021-06-28

### Changed

-   Auto update will show changelog when an update has been downloaded

## [1.2.0] - 2021-06-28

### Added

-   Added auto-update
-   Added update command (which has force update para1meter)
-   Added auto-update configuration with an interval in minutes

## [1.1.1] - 2021-06-25

### Fixed

-   Fix RCON error when list responses are too large
-   Kicks now fail when the player isn't in-game

## [1.1.0] - 2021-06-25

### Added

-   Automod is now fully customizable as well as infractions get saved to the database (restarting the bot won't reset infractions)
-   Added `deletehistory` and `deletepunishment` commands

### Changed

-   Made admin list saving/rollback toggleable and included notify only mode
-   Made RCON command use codeblock

### Removed

-   Removed history suggestion
-   Removed history over 10 offenses history

### Fixed

-   Fixed global punishment commands to not send multiple embeds and not save multiple database documents
