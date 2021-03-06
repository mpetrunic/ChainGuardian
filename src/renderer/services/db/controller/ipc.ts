import {ipcRenderer} from "electron";
import {IpcDatabaseEvents} from "../../../../main/db/events";
import {IDatabaseController, IFilterOptions, IKeyValue} from "@chainsafe/lodestar-db";
import {EventIterator} from "event-iterator";
import {randomBytes} from "crypto";
import {IpcRendererEvent} from "electron/main";

export class IpcDatabaseController implements IDatabaseController<Buffer, Buffer> {
    public async start(): Promise<void> {
        return;
    }

    public async stop(): Promise<void> {
        return;
    }

    public async get(key: Buffer): Promise<Buffer | null> {
        return await ipcRenderer.invoke(IpcDatabaseEvents.DATABASE_GET, key);
    }

    public async search(opts: IFilterOptions<Buffer>): Promise<Buffer[]> {
        return await ipcRenderer.invoke(IpcDatabaseEvents.DATABASE_SEARCH, opts.gt, opts.lt);
    }

    public async put(key: Buffer, value: Buffer): Promise<void> {
        await ipcRenderer.send(IpcDatabaseEvents.DATABASE_PUT, key, value);
    }

    public async delete(key: Buffer): Promise<void> {
        await ipcRenderer.send(IpcDatabaseEvents.DATABASE_DELETE, key);
    }

    public async batchPut(items: IKeyValue<Buffer, Buffer>[]): Promise<void> {
        await ipcRenderer.send(IpcDatabaseEvents.DATABASE_BATCH_PUT, items);
    }

    public batchDelete(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public keysStream(): AsyncIterable<Buffer> {
        throw new Error("Method not implemented.");
    }

    public async keys(opts?: IFilterOptions<Buffer>): Promise<Buffer[]> {
        return await ipcRenderer.invoke(IpcDatabaseEvents.DATABASE_KEYS, opts);
    }

    public valuesStream(): AsyncIterable<Buffer> {
        const id = randomBytes(12).toString("hex");
        ipcRenderer.sendSync(IpcDatabaseEvents.DATABASE_VALUES_STREAM, id);
        return new EventIterator(({push, stop}) => {
            const listener = (event: IpcRendererEvent, args: [string, Buffer]): void => {
                if (args[0] === id) {
                    //if there is event occurence without value, we reached end
                    if (!args[1]) {
                        stop();
                    } else {
                        push(args[1]);
                    }
                }
            };
            ipcRenderer.on(IpcDatabaseEvents.DATABASE_VALUES_EVENT, listener);
            return (): void => {
                ipcRenderer.removeListener(IpcDatabaseEvents.DATABASE_VALUES_EVENT, listener);
            };
        });
    }

    public async values(opts?: IFilterOptions<Buffer>): Promise<Buffer[]> {
        return await ipcRenderer.invoke(IpcDatabaseEvents.DATABASE_VALUES, opts);
    }

    public entriesStream(): AsyncIterable<IKeyValue<Buffer, Buffer>> {
        throw new Error("Method not implemented.");
    }

    public async entries(): Promise<IKeyValue<Buffer, Buffer>[]> {
        throw new Error("Method not implemented.");
    }
}
