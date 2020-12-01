import axios, {AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse} from "axios";
import database from "../../db/api/database";

export class HttpClient {
    private client: AxiosInstance;
    private readonly loggerKey?: string;

    public constructor(baseURL: string, options: {axios?: AxiosRequestConfig; loggerKey?: string} = {}) {
        if (!options) {
            // eslint-disable-next-line no-param-reassign
            options = {axios: {}};
        }
        this.loggerKey = options.loggerKey;
        this.client = axios.create({
            baseURL,
            ...options.axios,
        });
    }

    /**
     * Method that handles GET
     * @param url endpoint url
     * @param config
     */
    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const {onComplete, onError} = this.requestLogger();
        try {
            const result: AxiosResponse<T> = await this.client.get<T>(url, config);
            onComplete(result);
            return result.data;
        } catch (reason) {
            onError(reason);
            throw handleError(reason);
        }
    }

    /**
     * Method that handles POST
     * @param url endpoint url
     * @param data request body
     */
    public async post<T, T2>(url: string, data: T): Promise<T2> {
        const {onComplete, onError} = this.requestLogger();
        try {
            const result: AxiosResponse<T2> = await this.client.post(url, data);
            onComplete(result);
            return result.data;
        } catch (reason) {
            onError(reason);
            throw handleError(reason);
        }
    }

    /**
     * Method that handles logging
     */
    private requestLogger = (): {
        onComplete: (status: AxiosResponse) => void;
        onError: (error: AxiosError) => void;
    } => {
        const start = Date.now();
        return {
            onComplete: ({request, status}: AxiosResponse): void => {
                if (this.loggerKey)
                    database.networkLogs.addRecord(this.loggerKey, {
                        url: request.responseURL,
                        code: status,
                        latency: Date.now() - start,
                        time: Date.now(),
                    });
            },
            onError: (error: AxiosError): void => {
                if (this.loggerKey)
                    database.networkLogs.addRecord(this.loggerKey, {
                        url: error.config.url,
                        code: error.response?.status || 0,
                        latency: Date.now() - start,
                        time: Date.now(),
                    });
            },
        };
    };
}

const handleError = (error: AxiosError): Error => {
    let message: string;
    if (error.response) {
        message = error.response.data || error.response.statusText;
    } else {
        message = error.message.toString();
    }
    return new Error(message);
};
