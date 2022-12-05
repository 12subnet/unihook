import { autoRetry } from "@grammyjs/auto-retry";
import { conversations, createConversation } from "@grammyjs/conversations";
import { hydrateReply, parseMode } from "@grammyjs/parse-mode";
import { readdirSync } from "fs";
import { Bot, BotConfig, session } from "grammy";
import { MyContext } from "../../types/bot";
import Command from "../commands";
import { add, deleteMenu } from "./conversations";

export class CustomClient<C extends MyContext = MyContext> extends Bot<C> {
    public commands: Command[] = [];
    constructor(token: string, config?: BotConfig<C>) {
        super(token, config);
    }
    public prepate() {
        this.api.config.use(autoRetry());
        this.use(hydrateReply<MyContext>);
        this.api.config.use(parseMode("Markdown"));
        this.use(
            session({
                initial() {
                    return {};
                },
            }),
        );
        this.use(conversations());
        this.use(createConversation(add));
        this.use(deleteMenu);
        readdirSync("./build/commands").forEach(async (file) => {
            if (file.endsWith(".js")) {
                const data: Command = (await import(`../commands/${file}`)).default;
                this.commands.push(data);
            }
        });
    }
    public async handleCommand(ctx: C, command: string) {
        if (!command) throw new Error("Command is undefined");
        if (command.startsWith("/")) command = command.slice(1);
        if (command.includes("@")) {
            if (command.split("@")[1] !== this.botInfo.username) return;
            command = command.split("@")[0];
        }
        if (this.commands.filter((cmd) => cmd.command === command).length > 0) {
            return this.commands.filter((cmd) => cmd.command === command)[0].run(ctx);
        }
    }
}
