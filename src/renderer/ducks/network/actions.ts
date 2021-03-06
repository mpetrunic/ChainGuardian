import {networkSlice} from "./slice";
import {createAction} from "@reduxjs/toolkit";
import {RemoveBeaconNode, SaveBeaconNode, LoadValidatorBeaconNodes} from "./types";

export const {
    startDockerImagePull,
    endDockerImagePull,
    selectNetwork,
    loadedValidatorBeaconNodes,
    subscribeToBlockListening,
    unsubscribeToBlockListening,
} = networkSlice.actions;

export const cancelDockerPull = createAction("network/cancelDockerPull");

export const saveBeaconNode = createAction<SaveBeaconNode>(
    "network/saveBeaconNode",
    (url: string, network?: string, validatorKey?: string) => ({payload: {url, network, validatorKey}}),
);

export const removeBeaconNode = createAction<RemoveBeaconNode>(
    "network/removeBeaconNode",
    (image: string, validator: string) => ({payload: {image, validator}}),
);

export const loadValidatorBeaconNodes = createAction<LoadValidatorBeaconNodes>(
    "network/loadValidatorBeaconNodes",
    (validator: string, subscribe = false) => ({payload: {validator, subscribe}}),
);
