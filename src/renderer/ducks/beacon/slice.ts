import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {DockerConfig} from "../../models/beacons";

export enum BeaconStatus {
    active,
    syncing,
    offline,
}

export type Beacon = {
    url: string;
    status: BeaconStatus;
    docker?: DockerConfig;
};

export interface IBeaconDictionary {
    [key: string]: Beacon;
}

export interface IBeaconState {
    beacons: IBeaconDictionary;
    keys: string[];
}

const initialState: IBeaconState = {
    beacons: {},
    keys: [],
};

export const beaconSlice = createSlice({
    name: "beacon",
    initialState,
    reducers: {
        addBeacons: (state, action: PayloadAction<Beacon[]>): void => {
            action.payload.forEach((beacon) => {
                state.beacons[beacon.url] = beacon;
                if (!state.keys.some((key) => key === beacon.url)) {
                    state.keys.push(beacon.url);
                }
            });
        },
        addBeacon: {
            reducer: (state, action: PayloadAction<Beacon>): void => {
                state.beacons[action.payload.url] = action.payload;
                if (!state.keys.some((key) => key === action.payload.url)) {
                    state.keys.push(action.payload.url);
                }
            },
            prepare: (url: string, docker?: DockerConfig): {payload: Beacon} => ({
                payload: {url, docker, status: BeaconStatus.syncing},
            }),
        },
        removeBeacon: (state, action: PayloadAction<string>): void => {
            delete state.beacons[action.payload];
            const index = state.keys.findIndex((key) => key === action.payload);
            if (index !== -1) {
                state.keys.splice(index, 1);
            }
        },
    },
});
