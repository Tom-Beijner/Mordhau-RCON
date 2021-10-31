import Watchdog from "./Watchdog";

// Make the event name get a type from the eris types events list
// Maybe also make the execute function follow the listener function properties
interface MetaData {
    runOnce?: Boolean;
}

export default abstract class BaseEvent {
    public meta: MetaData;

    constructor(meta: MetaData) {
        this.meta = meta;
    }

    /**
     * @arg {any[]} args Required amount of args depending on the event
     * @returns {Promise<any>} Return a promise of any kind
     */
    public abstract execute(bot: Watchdog, ...args: any[]): Promise<any>;
}
