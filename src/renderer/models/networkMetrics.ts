import {ResponseErrorPieData} from "../containers/BeaconNode/BeaconNodeResponseErrorPieChart";

export type NetworkMetric = {
    url: string;
    code: number;
    latency: number;
    time: number;
};

export interface INetworkMetrics {
    records: NetworkMetric[];
}

export class NetworkMetrics implements INetworkMetrics {
    public records: NetworkMetric[] = [];

    public constructor(networkMetric: INetworkMetrics | null) {
        if (networkMetric !== null) this.records = networkMetric.records;
    }

    public getRecordsFromRange(from: Date | number, to: Date | number = Date.now()): NetworkMetric[] {
        // eslint-disable-next-line no-param-reassign
        if (typeof from !== "number") from = from.getTime();
        // eslint-disable-next-line no-param-reassign
        if (typeof to !== "number") to = to.getTime();
        return this.records.filter(({time}) => time > from && time < to);
    }

    public getNetworkAverageLatency(from: Date | number, to?: Date | number): number | null {
        const records = this.getRecordsFromRange(from, to);
        if (!records.length) return null;
        return records.reduce((prev, curr) => prev + curr.latency, 0) / records.length;
    }

    public getNetworkErrorPieData(): ResponseErrorPieData {
        const pieData: ResponseErrorPieData = [
            {name: "2xx", value: null, color: "#09BC8A"},
            {name: "4xx", value: null, color: "#EDFF86"},
            {name: "5xx", value: null, color: "#EA526F"},
        ];
        this.records.forEach(({code}) => {
            if (code >= 200 && code < 300) {
                if (pieData[0].value === null) pieData[0].value = 0;
                pieData[0].value++;
            } else if (code >= 400 && code < 500) {
                if (pieData[1].value === null) pieData[1].value = 0;
                pieData[1].value++;
            } else if (code >= 500) {
                if (pieData[2].value === null) pieData[2].value = 0;
                pieData[2].value++;
            }
        });
        return pieData;
    }

    public addRecord(record: NetworkMetric): void {
        this.records.push(record);
        this.prune();
    }

    // remove logs older that 1 day
    private prune(): void {
        const unixDayWhitExtraHour = 25 * 60 * 60 * 1000;
        const dayBefore = Date.now() - unixDayWhitExtraHour;
        this.records = this.records.filter(({time}) => time > dayBefore);
    }
}
