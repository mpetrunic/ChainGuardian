import {select, put, SelectEffect, PutEffect, call, CallEffect, all, takeEvery} from "redux-saga/effects";
import {CGAccount} from "../../models/account";
import {deleteKeystore} from "../../services/utils/account";
import {fromHex} from "../../services/utils/bytes";
import {getNetworkConfig} from "../../services/eth2/networks";
import {EthersNotifier} from "../../services/deposit/ethers";
import {getValidatorStatus, ValidatorStatus} from "../../services/validator/status";
import {ValidatorLogger} from "../../services/eth2/client/logger";
import {ValidatorDB} from "../../services/db/api/validator";
import database from "../../services/db/api/database";
import {config} from "@chainsafe/lodestar-config/lib/presets/minimal";
import {IByPublicKey, IValidator} from "./slice";
import {
    loadValidators,
    addValidator,
    removeValidator,
    startValidatorService,
    stopValidatorService,
    loadValidatorStatus,
    loadedValidatorsBalance,
    stopActiveValidatorService,
    startNewValidatorService,
    updateValidatorsFromChain,
    updateValidatorChainData, removeActiveValidator, addNewValidator, updateValidatorStatus, loadValidatorsAction
} from "./actions";
import {ICGKeystore} from "../../services/keystore";
import {loadValidatorBeaconNodes, unsubscribeToBlockListening} from "../network/actions";
import {Validator} from "@chainsafe/lodestar-validator";
import {IValidatorBeaconNodes} from "../../models/beaconNode";
import {loadValidatorBeaconNodesSaga} from "../network/sagas";
import {AllEffect} from "@redux-saga/core/effects";
import {ValidatorResponse} from "@chainsafe/lodestar-types";

interface IValidatorServices {
    [validatorAddress: string]: Validator;
}

const validatorServices: IValidatorServices = {};

function* loadValidatorsSaga():
Generator<SelectEffect | PutEffect | Promise<ICGKeystore[]>, void, ICGKeystore[] & (CGAccount | null)> {
    // TODO: use selector
    const auth: CGAccount | null = yield select(s => s.auth.account);
    if (auth) {
        const validators: ICGKeystore[] = yield auth.loadValidators();
        const validatorArray: IValidator[] = validators.map((keyStore, index) => ({
            name: keyStore.getName() ?? `Validator - ${index}`,
            status: undefined,
            publicKey: keyStore.getPublicKey(),
            network: auth.getValidatorNetwork(keyStore.getPublicKey()),
            keystore: keyStore,
            isRunning: undefined,
        }));
        yield put(loadValidators(validatorArray));
    }
}

function* addNewValidatorSaga(action: ReturnType<typeof addNewValidator>): Generator<PutEffect> {
    const keystore = action.meta.loadKeystore(action.payload);
    const validator: IValidator = {
        name: `Validator ${action.meta.getValidators().length+2}`,
        publicKey: action.payload,
        network: action.meta!.getValidatorNetwork(action.payload),
        keystore,
        status: undefined,
        isRunning: false,
    };

    yield put(addValidator(validator));
}

function* removeValidatorSaga(action: ReturnType<typeof removeActiveValidator>):
Generator<SelectEffect | PutEffect, void, (CGAccount | null)> {
    // TODO: use selector
    const auth: CGAccount | null = yield select(s => s.auth.account);
    deleteKeystore(auth.directory, action.payload);
    auth.removeValidator(action.meta);

    yield put(unsubscribeToBlockListening(action.payload));
    yield put(removeValidator(action.payload));
}

function* loadValidatorChainData(action: ReturnType<typeof updateValidatorChainData>):
Generator<CallEffect | AllEffect<CallEffect>> {
    // Initialize validator object with API client
    yield call(loadValidatorBeaconNodesSaga, loadValidatorBeaconNodes(action.payload, true));
    // Load validator state from chain for i.e. balance
    // TODO: load all validators in one request per network
    yield all([
        call(loadValidatorsFromChain, updateValidatorsFromChain([action.payload])),
        call(loadValidatorStatusSaga, updateValidatorStatus(action.payload)),
    ]);
}

function* loadValidatorsFromChain(action: ReturnType<typeof updateValidatorsFromChain>):
Generator<SelectEffect | CallEffect | PutEffect, void, IValidatorBeaconNodes & ValidatorResponse[]> {
    // TODO: use selector
    const validatorBeaconNodes: IValidatorBeaconNodes = yield select(s => s.network.validatorBeaconNodes);
    const beaconNodes = validatorBeaconNodes[action.payload[0]];
    if (beaconNodes && beaconNodes.length > 0) {
        // TODO: Use any working beacon node instead of first one
        const client = beaconNodes[0].client;
        const pubKeys = action.payload.map(address => fromHex(address));
        const response = yield call(client.beacon.getValidators, pubKeys);

        yield put(loadedValidatorsBalance(response));
    }
}

function* loadValidatorStatusSaga(action: ReturnType<typeof updateValidatorStatus>):
Generator<SelectEffect | CallEffect | PutEffect, void, ValidatorStatus & IValidatorBeaconNodes & IByPublicKey> {
    // TODO: use selector
    const validatorBeaconNodes: IValidatorBeaconNodes = yield select(s => s.network.validatorBeaconNodes);
    const beaconNodes = validatorBeaconNodes[action.payload];
    if (beaconNodes && beaconNodes.length > 0) {
        // TODO: Use any working beacon node instead of first one
        const eth2 = beaconNodes[0].client;
        // TODO: use selector
        const byPublicKey: IByPublicKey = yield select(s => s.validators.byPublicKey);
        const network = byPublicKey[action.payload].network;
        const networkConfig = getNetworkConfig(network);
        const eth1 = new EthersNotifier(networkConfig, networkConfig.eth1Provider);
        const status: ValidatorStatus = yield call(getValidatorStatus, fromHex(action.payload), eth2, eth1);

        yield put(loadValidatorStatus(status, action.payload));
    }
}

function* startService(action: ReturnType<typeof startNewValidatorService>):
Generator<SelectEffect | PutEffect | Promise<void>, void, IValidatorBeaconNodes> {
    const logger = new ValidatorLogger();
    // TODO: use selector
    const validatorBeaconNodes = yield select(s => s.network.validatorBeaconNodes);
    const publicKey = action.payload.publicKey.toHexString();
    // TODO: Use beacon chain proxy instead of first node
    const eth2API = validatorBeaconNodes[publicKey][0].client;

    if (!validatorServices[publicKey]) {
        validatorServices[publicKey] = new Validator({
            db: new ValidatorDB(database),
            api: eth2API,
            config,
            keypairs: [action.payload],
            logger
        });
    }
    yield validatorServices[publicKey].start();

    yield put(startValidatorService(logger, publicKey));
}

function* stopService(action: ReturnType<typeof stopActiveValidatorService>): Generator<PutEffect | Promise<void>> {
    const publicKey = action.payload.publicKey.toHexString();
    yield validatorServices[publicKey].stop();

    yield put(stopValidatorService(publicKey));
}

export function* validatorSagaWatcher(): Generator {
    yield all([
        takeEvery(loadValidatorsAction, loadValidatorsSaga),
        takeEvery(addNewValidator, addNewValidatorSaga),
        takeEvery(removeActiveValidator, removeValidatorSaga),
        takeEvery(updateValidatorChainData, loadValidatorChainData),
        takeEvery(updateValidatorsFromChain, loadValidatorsFromChain),
        takeEvery(updateValidatorStatus, loadValidatorStatusSaga),
        takeEvery(startNewValidatorService, startService),
        takeEvery(stopActiveValidatorService, stopService),
    ]);
}
