// src/hooks/useDataPoints.ts
import {SetStateAction, useEffect, useState} from 'react';
import {DataPointDocument, getDatabase} from '@/rxdb/db';

export function useDataPoints() {
    const [dataPoints, setDataPoints] = useState<DataPointDocument[]>([]);

    useEffect(() => {
        (async () => {
            const db = await getDatabase();
            // @ts-ignore
            const sub = db.data_points.find({}).$.subscribe((docs: SetStateAction<DataPointDocument[]>) => {
                setDataPoints(docs);
            });

            return () => sub.unsubscribe();
        })();
    }, []);

    const addDataPoint = async (id: string, date: string, cost: number, revenue: number) => {
        const db = await getDatabase();
        // @ts-ignore
        await db.data_points.upsert({id, date, cost, revenue});
    };

    return {dataPoints, addDataPoint};
}
