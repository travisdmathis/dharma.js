import * as singleLineString from "single-line-string";
import * as Web3 from "web3";

import { ContractsAPI } from ".";
import { IntervalManager } from "../../utils/interval_utils";
import { Web3Utils } from "../../utils/web3_utils";

import { Assertions } from "../invariants";

export const BlockchainAPIErrors = {
    AWAIT_MINE_TX_TIMED_OUT: (txHash: string) =>
        singleLineString`Timeout has been exceeded in
                         awaiting mining of transaction
                         with hash ${txHash}.`,
};

/**
 * The following default timeout is provided to the IntervalManager when awaiting mined
 * transactions. The value is represented in milliseconds.
 *
 * @type {number}
 */
export const DEFAULT_TIMEOUT_FOR_TX_MINED = 60000;

export class BlockchainAPI {
    public intervalManager: IntervalManager;

    private readonly web3Utils: Web3Utils;

    private assert;
    private contracts: ContractsAPI;

    constructor(web3: Web3, contracts: ContractsAPI) {
        this.web3Utils = new Web3Utils(web3);
        this.intervalManager = new IntervalManager();
        this.assert = new Assertions(web3, contracts);
        this.contracts = contracts;
    }

    /**
     * Asynchronously polls the Ethereum blockchain until the specified
     * transaction has been mined or the timeout limit is reached, whichever
     * occurs first.
     *
     * @param  txHash                 the hash of the transaction.
     * @param  pollingIntervalMs=1000 the interval at which the blockchain should be polled.
     * @param  timeoutMs              the number of milliseconds until this process times out. If
     *                                no value is provided, a default value is used.
     * @return                        the transaction receipt resulting from the mining process.
     */
    public async awaitTransactionMinedAsync(
        txHash: string,
        pollingIntervalMs = 1000,
        timeoutMs = DEFAULT_TIMEOUT_FOR_TX_MINED,
    ): Promise<Web3.TransactionReceipt> {
        const intervalManager = this.intervalManager;
        const web3Utils = this.web3Utils;

        this.assert.schema.bytes32("txHash", txHash);

        return new Promise<Web3.TransactionReceipt>((resolve, reject) => {
            intervalManager.setInterval(
                txHash,
                async () => {
                    try {
                        const receipt = await web3Utils.getTransactionReceiptAsync(txHash);

                        if (receipt) {
                            resolve(receipt);
                            // Stop the interval.
                            return false;
                        } else {
                            // Continue the interval.
                            return true;
                        }
                    } catch (e) {
                        reject(e);
                    }
                },
                async () => {
                    reject(new Error(BlockchainAPIErrors.AWAIT_MINE_TX_TIMED_OUT(txHash)));
                },
                pollingIntervalMs,
                timeoutMs,
            );
        });
    }
}
