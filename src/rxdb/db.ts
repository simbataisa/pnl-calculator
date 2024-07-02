// src/rxdb/db.ts
import {addRxPlugin, createRxDatabase, RxCollection, RxDatabase, RxDocument} from 'rxdb';
import {RxDBDevModePlugin} from 'rxdb/plugins/dev-mode';
import {getRxStorageDexie} from 'rxdb/plugins/storage-dexie';

addRxPlugin(RxDBDevModePlugin);

type DataPointType = {
    id: string;
    date: string;
    cost: number;
    revenue: number;
    PnL?: number;
    YtdPnL?: number;
    YoyPnL?: number;
}

export type DataPointDocument = RxDocument<DataPointType>;
type DataPointCollection = RxCollection<DataPointType>;

interface MyDatabaseCollections {
    dataPoints: DataPointCollection;
}

export type MyDatabase = RxDatabase<MyDatabaseCollections>;

let dbPromise: Promise<MyDatabase> | null = null;

export async function createDatabase(): Promise<MyDatabase> {
    const db = await createRxDatabase<MyDatabaseCollections>({
        name: 'mydb',
        storage: getRxStorageDexie(),
        password: 'myLongAndStupidPassword',
    });

    await db.addCollections({
        data_points: {
            schema: {
                title: 'hero schema',
                version: 0,
                description: 'describes a simple hero',
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100 // <- the primary key must have set maxLength
                    },
                    date: {
                        type: 'string',
                        format: 'date-time'
                    },
                    revenue: {
                        type: 'number'
                    },
                    cost: {
                        type: 'number'
                    },
                    pnl: {
                        type: 'number'
                    },
                    ytdPnl: {
                        type: 'number'
                    },
                    yoyPnl: {
                        type: 'number'
                    }
                },
                required: ['id', 'date', 'revenue', 'cost']
            },
        },
    });

    return db;
}

export function getDatabase(): Promise<MyDatabase> {
    if (!dbPromise) {
        dbPromise = createDatabase();
    }
    return dbPromise;
}
