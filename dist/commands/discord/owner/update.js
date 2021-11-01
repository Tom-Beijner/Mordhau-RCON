"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_prototype_flatmap_1 = __importDefault(require("array.prototype.flatmap"));
const slash_create_1 = require("slash-create");
const Config_1 = __importDefault(require("../../../structures/Config"));
const SlashCommand_1 = __importDefault(require("../../../structures/SlashCommand"));
const logger_1 = __importDefault(require("../../../utils/logger"));
class Update extends SlashCommand_1.default {
    constructor(creator, bot, commandName) {
        super(creator, bot, {
            name: commandName,
            description: "Update bot",
            options: [
                {
                    name: "forceupdate",
                    description: "Force update the bot",
                    type: slash_create_1.CommandOptionType.BOOLEAN,
                },
            ],
            defaultPermission: false,
            permissions: Object.assign({}, ...bot.client.guilds.map((guild) => ({
                [guild.id]: array_prototype_flatmap_1.default(Config_1.default.get("discord.roles").filter((role) => role.commands.includes(commandName)), (role) => role.Ids.map((id) => ({
                    type: slash_create_1.ApplicationCommandPermissionType.ROLE,
                    id,
                    permission: true,
                }))),
            }))),
        });
    }
    async run(ctx) {
        await ctx.defer();
        const options = {
            forceUpdate: ctx.options.forceupdate,
        };
        try {
            const result = await (!options.forceUpdate
                ? this.bot.autoUpdater.check()
                : this.bot.autoUpdater.forceUpdate());
            logger_1.default.info("Command", `${ctx.member.displayName}#${ctx.member.user.discriminator} used update command (Force Update: ${options.forceUpdate ? "Yes" : "No"})`);
            if (!options.forceUpdate) {
                return "Bot is up to date!";
            }
            await ctx.send({
                embeds: [
                    {
                        title: `${options.forceUpdate ? "Force " : ""}Update`,
                        description: result.success
                            ? options.forceUpdate
                                ? `Update Succeed`
                                : `Updated bot to ${await this.bot.autoUpdater.readRemoteVersion()}`
                            : `Update Failed (${result.error.message || result.error})`,
                    },
                ],
            }, { ephemeral: true });
        }
        catch (error) {
            await ctx.send({
                content: `An error occured while performing the command (${error.message || error})`,
            });
        }
    }
}
exports.default = Update;
