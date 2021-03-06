import React, {useEffect, useState} from "react";
import {useDispatch} from "react-redux";
import logger from "electron-log";
import {useHistory} from "react-router";
import {ButtonDestructive, ButtonInverted, ButtonPrimary} from "../../components/Button/ButtonStandard";
import {ConfirmModal} from "../../components/ConfirmModal/ConfirmModal";
import {Loading} from "../../components/Loading/Loading";
import {DockerRegistry} from "../../services/docker/docker-registry";
import {createNotification} from "../../ducks/notification/actions";
import {removeBeacon} from "../../ducks/beacon/actions";
import {Routes} from "../../constants/routes";

enum Modal {
    none,
    start,
    stop,
    kill,
    remove,
}

interface IBeaconNodeButtonsProps {
    url: string;
    image?: string;
}

export const BeaconNodeButtons: React.FunctionComponent<IBeaconNodeButtonsProps> = ({
    url,
    image,
}: IBeaconNodeButtonsProps) => {
    const dispatch = useDispatch();
    const history = useHistory();

    const [confirmModal, setConfirmModal] = useState(Modal.none);
    const [loading, setLoading] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        if (image) {
            DockerRegistry.getContainer(image).isRunning().then(setIsRunning);
        }
    }, []);

    const stopContainer = async (): Promise<void> => {
        setLoading(true);
        try {
            await DockerRegistry.getContainer(image)!.stop();
            setIsRunning(false);
        } catch (e) {
            logger.error(e);
            dispatch(
                createNotification({
                    source: history.location.pathname,
                    title: "Error while trying to stop beacon node container",
                }),
            );
        }
        setConfirmModal(Modal.none);
        setLoading(false);
    };

    const startContainer = async (): Promise<void> => {
        setLoading(true);
        try {
            await DockerRegistry.getContainer(image)!.startStoppedContainer();
            setIsRunning(true);
        } catch (e) {
            logger.error(e);
            dispatch(
                createNotification({
                    source: history.location.pathname,
                    title: "Error while trying to start beacon node container",
                }),
            );
        }
        setConfirmModal(Modal.none);
        setLoading(false);
    };

    const killContainer = async (): Promise<void> => {
        setLoading(true);
        try {
            await DockerRegistry.getContainer(image)!.kill();
            setIsRunning(false);
        } catch (e) {
            logger.error(e);
            dispatch(
                createNotification({
                    source: history.location.pathname,
                    title: "Error while trying to kill beacon node container",
                }),
            );
        }
        setConfirmModal(Modal.none);
        setLoading(false);
    };

    const removeContainer = async (): Promise<void> => {
        setLoading(true);
        try {
            const container = DockerRegistry.getContainer(image);
            if (container) {
                await container.stop();
                await container.remove();
            }
            if (
                history.location.pathname.includes(Routes.BEACON_NODE_DETAILS.replace(":url", encodeURIComponent(url)))
            ) {
                history.push(Routes.BEACON_NODES);
            }
            dispatch(removeBeacon(url));
        } catch (e) {
            logger.error(e);
            dispatch(
                createNotification({
                    source: history.location.pathname,
                    title: "Error while trying to remove beacon node container",
                }),
            );
        }
        setLoading(false);
    };

    return (
        <>
            <div className='row buttons'>
                {image ? (
                    isRunning ? (
                        <>
                            <ButtonInverted onClick={(): void => setConfirmModal(Modal.stop)}>Stop</ButtonInverted>
                            <ButtonDestructive onClick={(): void => setConfirmModal(Modal.kill)}>
                                Kill
                            </ButtonDestructive>
                        </>
                    ) : (
                        <ButtonPrimary onClick={(): void => setConfirmModal(Modal.start)}>Start</ButtonPrimary>
                    )
                ) : null}
                <ButtonDestructive onClick={(): void => setConfirmModal(Modal.remove)}>Remove</ButtonDestructive>
            </div>

            <ConfirmModal
                showModal={confirmModal === Modal.remove}
                question={"Are you sure?"}
                description={"This will remove all your beacon chain data."}
                onOKClick={removeContainer}
                onCancelClick={(): void => setConfirmModal(Modal.none)}
            />

            <ConfirmModal
                showModal={confirmModal === Modal.start}
                question={"Are you sure?"}
                description={"This will start your beacon node container."}
                onOKClick={startContainer}
                onCancelClick={(): void => setConfirmModal(Modal.none)}
            />

            <ConfirmModal
                showModal={confirmModal === Modal.stop}
                question={"Are you sure?"}
                description={"This will stop your beacon node container."}
                onOKClick={stopContainer}
                onCancelClick={(): void => setConfirmModal(Modal.none)}
            />

            <ConfirmModal
                showModal={confirmModal === Modal.kill}
                question={"Are you sure?"}
                description={"This will kill your beacon node container."}
                onOKClick={killContainer}
                onCancelClick={(): void => setConfirmModal(Modal.none)}
            />

            <Loading visible={loading} title='Loading' />
        </>
    );
};
