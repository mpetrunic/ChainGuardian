import {all, call, put, takeEvery, PutEffect, CallEffect} from "redux-saga/effects";
import {startLocalBeacon, removeBeacon, addBeacon, addBeacons} from "./actions";
import {endDockerImagePull, startDockerImagePull} from "../network/actions";
import {getNetworkConfig} from "../../services/eth2/networks";
import {BeaconChain} from "../../services/docker/chain";
import {SupportedNetworks} from "../../services/eth2/supportedNetworks";
import database from "../../services/db/api/database";
import {Beacons} from "../../models/beacons";
import {postInit} from "../store";

function* startLocalBeaconSaga({
    payload: {network, ports, folderPath, eth1Url, discoveryPort, libp2pPort, rpcPort},
}: ReturnType<typeof startLocalBeacon>): Generator<PutEffect | CallEffect, void, BeaconChain> {
    // Pull image first
    yield put(startDockerImagePull());
    const image = getNetworkConfig(network).dockerConfig.image;
    yield call(BeaconChain.pullImage, image);
    yield put(endDockerImagePull());

    // Start chain
    switch (network) {
        default:
            yield put(
                addBeacon(`http://localhost:${ports[1].local}`, {
                    id: (yield call(BeaconChain.startBeaconChain, SupportedNetworks.LOCALHOST, ports)).getName(),
                    network,
                    folderPath,
                    eth1Url,
                    discoveryPort,
                    libp2pPort,
                    rpcPort,
                }),
            );
    }
}

function* storeBeacon({payload: {url, docker}}: ReturnType<typeof addBeacon>): Generator<Promise<void>> {
    yield database.beacons.upsert({url, docker});
}

function* removeBeaconSaga({payload}: ReturnType<typeof removeBeacon>): Generator<Promise<[boolean, boolean]>> {
    yield database.beacons.remove(payload);
}

function* initializeBeaconsFromStore(): Generator<Promise<Beacons> | PutEffect | Promise<void>, void, Beacons> {
    const store = yield database.beacons.get();
    if (store !== null) {
        const {beacons} = store;

        yield BeaconChain.startAllLocalBeaconNodes();

        yield put(addBeacons(beacons.map(({url, docker}) => ({url, docker, status: "init"}))));
    }
}

export function* beaconSagaWatcher(): Generator {
    yield all([
        takeEvery(startLocalBeacon, startLocalBeaconSaga),
        takeEvery(addBeacon, storeBeacon),
        takeEvery(removeBeacon, removeBeaconSaga),
        takeEvery(postInit, initializeBeaconsFromStore),
    ]);
}