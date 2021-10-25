import flatMap from "array.prototype.flatmap";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    CommandOptionType,
    SlashCreator,
} from "slash-create";
import config, { Role } from "../../../structures/Config";
import SlashCommand from "../../../structures/SlashCommand";
import Watchdog from "../../../structures/Watchdog";
import logger from "../../../utils/logger";

export default class Update extends SlashCommand {
    constructor(creator: SlashCreator, bot: Watchdog, commandName: string) {
        super(creator, bot, {
            name: commandName,
            description: "Update bot",
            options: [
                {
                    name: "forceupdate",
                    description: "Force update the bot",
                    type: CommandOptionType.BOOLEAN,
                },
            ],
            defaultPermission: false,
            permissions: Object.assign(
                {},
                ...bot.client.guilds.map((guild) => ({
                    [guild.id]: flatMap(
                        (config.get("discord.roles") as Role[]).filter((role) =>
                            role.commands.includes(commandName)
                        ),
                        (role) =>
                            role.Ids.map((id) => ({
                                type: ApplicationCommandPermissionType.ROLE,
                                id,
                                permission: true,
                            }))
                    ),
                }))
            ),
        });
    }

    async run(ctx: CommandContext) {
        await ctx.defer();
        const options = {
            forceUpdate: ctx.options.forceupdate as boolean,
        };

        try {
            const result = await (!options.forceUpdate
                ? this.bot.autoUpdater.check()
                : this.bot.autoUpdater.forceUpdate());

            logger.info(
                "Command",
                `${ctx.member.displayName}#${
                    ctx.member.user.discriminator
                } used update command (Force Update: ${
                    options.forceUpdate ? "Yes" : "No"
                })`
            );

            if (!options.forceUpdate) {
                return "Bot is up to date!";
            }

            await ctx.send(
                {
                    embeds: [
                        {
                            title: `${
                                options.forceUpdate ? "Force " : ""
                            }Update`,
                            description: result.success
                                ? options.forceUpdate
                                    ? `Update Succeed`
                                    : `Updated bot to ${await this.bot.autoUpdater.readRemoteVersion()}`
                                : `Update Failed (${
                                      result.error.message || result.error
                                  })`,
                        },
                    ],
                },
                { ephemeral: true }
            );
        } catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${
                    error.message || error
                })`,
            });
        }
    }
}
