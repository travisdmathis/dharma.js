// Given that we rely on having access to the deployed Dharma smart contracts,
// we unmock the Dharma smart contracts artifacts package to pull the most recently
// deployed contracts on the current network.
jest.unmock("@dharmaprotocol/contracts");

// Unmock the "fs-extra" package in order to give us
// access to the deployed TokenRegistry on the
// test chain.
jest.unmock("fs-extra");

// libraries
import * as Web3 from "web3";
import * as moment from "moment";

// utils
import { BigNumber } from "utils/bignumber";
import { ACCOUNTS } from "../../accounts";
import * as Units from "utils/units";
import { Web3Utils } from "utils/web3_utils";

// wrappers
import {
    DebtKernelContract,
    ERC20Contract,
    RepaymentRouterContract,
    SimpleInterestTermsContractContract,
} from "src/wrappers";

// types
import { DebtOrder, DebtRegistryEntry } from "src/types";

// adapters
import {
    CollateralizedSimpleInterestLoanAdapter,
    CollateralizedLoanTerms,
    CollateralizedAdapterErrors,
    CollateralizedTermsContractParameters,
    CollateralizedSimpleInterestLoanOrder,
} from "src/adapters/collateralized_simple_interest_loan_adapter";
import { SimpleInterestLoanAdapter } from "src/adapters/simple_interest_loan_adapter";

import { ContractsAPI, ContractsError } from "src/apis/contracts_api";

const provider = new Web3.providers.HttpProvider("http://localhost:8545");
const web3 = new Web3(provider);
const web3Utils = new Web3Utils(web3);
const contracts = new ContractsAPI(web3);

const collateralizedSimpleInterestLoanAdapter = new CollateralizedSimpleInterestLoanAdapter(
    web3,
    contracts,
);
const collateralizedLoanTerms = new CollateralizedLoanTerms(web3, contracts);

const TX_DEFAULTS = { from: ACCOUNTS[0].address, gas: 4712388 };

interface Scenario {
    unpackedParams: CollateralizedTermsContractParameters;
    packedParams: string;
}

describe("Collateralized Terms Contract Interface (Unit Tests)", () => {
    let snapshotId: number;

    beforeEach(async () => {
        snapshotId = await web3Utils.saveTestSnapshot();
    });

    afterEach(async () => {
        await web3Utils.revertToSnapshot(snapshotId);
    });

    const scenario_1: Scenario = {
        unpackedParams: {
            collateralTokenIndex: new BigNumber(0),
            collateralAmount: new BigNumber(3.5 * 10 ** 18),
            gracePeriodInDays: new BigNumber(5),
        },
        packedParams: "0x000000000000000000000000000000000000000000000030927f74c9de000005",
    };

    const scenario_2: Scenario = {
        unpackedParams: {
            collateralTokenIndex: new BigNumber(1),
            collateralAmount: new BigNumber(723489020 * 10 ** 18),
            gracePeriodInDays: new BigNumber(30),
        },
        packedParams: "0x00000000000000000000000000000000000000125674c25cd7f81d067000001e",
    };

    const scenario_3: Scenario = {
        unpackedParams: {
            collateralTokenIndex: new BigNumber(8),
            collateralAmount: new BigNumber(1212234234 * 10 ** 18),
            gracePeriodInDays: new BigNumber(90),
        },
        packedParams: "0x0000000000000000000000000000000000000083eabc9580d20c1abba800005a",
    };

    describe("#packParameters", () => {
        describe("...with invalid collateral token index", () => {
            test("should throw INVALID_TOKEN_INDEX error", () => {
                const invalidCollateralTokenIndex = new BigNumber(300);

                expect(() => {
                    collateralizedLoanTerms.packParameters({
                        ...scenario_1.unpackedParams,
                        collateralTokenIndex: invalidCollateralTokenIndex,
                    });
                }).toThrow(
                    CollateralizedAdapterErrors.INVALID_TOKEN_INDEX(invalidCollateralTokenIndex),
                );
            });
        });
        describe("...with collateral amount > 2^92 - 1", () => {
            test("should throw COLLATERAL_AMOUNT_EXCEEDS_MAXIMUM error", () => {
                expect(() => {
                    collateralizedLoanTerms.packParameters({
                        ...scenario_1.unpackedParams,
                        collateralAmount: new BigNumber(3.5 * 10 ** 38),
                    });
                }).toThrow(CollateralizedAdapterErrors.COLLATERAL_AMOUNT_EXCEEDS_MAXIMUM());
            });
        });
        describe("...with collateral amount < 0", () => {
            test("should throw COLLATERAL_AMOUNT_IS_NEGATIVE error", () => {
                expect(() => {
                    collateralizedLoanTerms.packParameters({
                        ...scenario_1.unpackedParams,
                        collateralAmount: new BigNumber(-1),
                    });
                }).toThrow(CollateralizedAdapterErrors.COLLATERAL_AMOUNT_IS_NEGATIVE());
            });
        });
        describe("...with collateral amount containing decimals", () => {
            test("should throw INVALID_DECIMAL_VALUE error", () => {
                expect(() => {
                    collateralizedLoanTerms.packParameters({
                        ...scenario_1.unpackedParams,
                        collateralAmount: new BigNumber(100.4567),
                    });
                }).toThrowError(CollateralizedAdapterErrors.INVALID_DECIMAL_VALUE());
            });
        });
        describe("...with grace period in days < 0", () => {
            test("should throw GRACE_PERIOD_IS_NEGATIVE error", () => {
                expect(() => {
                    collateralizedLoanTerms.packParameters({
                        ...scenario_1.unpackedParams,
                        gracePeriodInDays: new BigNumber(-1),
                    });
                }).toThrowError(CollateralizedAdapterErrors.GRACE_PERIOD_IS_NEGATIVE());
            });
        });
        describe("...with grace period in days > 255", () => {
            test("should throw GRACE_PERIOD_EXCEEDS_MAXIMUM error", () => {
                expect(() => {
                    collateralizedLoanTerms.packParameters({
                        ...scenario_1.unpackedParams,
                        gracePeriodInDays: new BigNumber(256),
                    });
                }).toThrowError(CollateralizedAdapterErrors.GRACE_PERIOD_EXCEEDS_MAXIMUM());
            });
        });
        describe("...with grace period containing decimals", () => {
            test("should throw INVALID_DECIMAL_VALUE error", () => {
                expect(() => {
                    collateralizedLoanTerms.packParameters({
                        ...scenario_1.unpackedParams,
                        gracePeriodInDays: new BigNumber(1.567),
                    });
                }).toThrowError(CollateralizedAdapterErrors.INVALID_DECIMAL_VALUE());
            });
        });
        describe("...with valid collateral token index, collateral amount, and grace period in days", () => {
            describe("Scenario #1", () => {
                test("should return correctly packed parameters", () => {
                    expect(
                        collateralizedLoanTerms.packParameters(scenario_1.unpackedParams),
                    ).toEqual(scenario_1.packedParams);
                });
            });
            describe("Scenario #2", () => {
                test("should return correctly packed parameters", () => {
                    expect(
                        collateralizedLoanTerms.packParameters(scenario_2.unpackedParams),
                    ).toEqual(scenario_2.packedParams);
                });
            });
            describe("Scenario #3", () => {
                test("should return correctly packed parameters", () => {
                    expect(
                        collateralizedLoanTerms.packParameters(scenario_3.unpackedParams),
                    ).toEqual(scenario_3.packedParams);
                });
            });
        });
    });

    describe("#unpackParameters", () => {
        describe("...with value that has too few bytes", () => {
            const termsContractParameters = "0x" + "f".repeat(63);

            test("should throw INVALID_PACKED_PARAMETERS error", () => {
                expect(() => {
                    collateralizedLoanTerms.unpackParameters(termsContractParameters);
                }).toThrowError(/Expected packedParams to conform to schema \/Bytes32/);
            });
        });
        describe("...with value that has too many bytes", () => {
            const termsContractParameters = "0x" + "f".repeat(65);

            test("should throw INVALID_PACKED_PARAMETERS error", () => {
                expect(() => {
                    collateralizedLoanTerms.unpackParameters(termsContractParameters);
                }).toThrowError(/Expected packedParams to conform to schema \/Bytes32/);
            });
        });
        describe("...with value that includes non-hexadecimal characters", () => {
            const termsContractParameters = "0x" + "z".repeat(64);

            test("should throw INVALID_PACKED_PARAMETERS error", () => {
                expect(() => {
                    collateralizedLoanTerms.unpackParameters(termsContractParameters);
                }).toThrowError(/Expected packedParams to conform to schema \/Bytes32/);
            });
        });
    });
    describe("...with valid termsContractParameters string", () => {
        describe("Scenario #1", () => {
            test("should return correctly unpacked parameters", () => {
                expect(collateralizedLoanTerms.unpackParameters(scenario_1.packedParams)).toEqual(
                    scenario_1.unpackedParams,
                );
            });
        });
        describe("Scenario #2", () => {
            test("should return correctly unpacked parameters", () => {
                expect(collateralizedLoanTerms.unpackParameters(scenario_2.packedParams)).toEqual(
                    scenario_2.unpackedParams,
                );
            });
        });
        describe("Scenario #3", () => {
            test("should return correctly unpacked parameters", () => {
                expect(collateralizedLoanTerms.unpackParameters(scenario_3.packedParams)).toEqual(
                    scenario_3.unpackedParams,
                );
            });
        });
    });
});

describe("Collateralized Simple Interest Loan Adapter (Unit Tests)", () => {
    let debtKernelAddress: string;
    let repaymentRouterAddress: string;

    let defaultLoanOrder: CollateralizedSimpleInterestLoanOrder;

    beforeAll(async () => {
        const debtKernel = await DebtKernelContract.deployed(web3, TX_DEFAULTS);
        const repaymentRouter = await RepaymentRouterContract.deployed(web3, TX_DEFAULTS);

        debtKernelAddress = debtKernel.address;
        repaymentRouterAddress = repaymentRouter.address;

        defaultLoanOrder = {
            principalAmount: Units.ether(10),
            principalTokenSymbol: "REP",
            interestRate: new BigNumber(0.14),
            amortizationUnit: SimpleInterestLoanAdapter.Installments.WEEKLY,
            termLength: new BigNumber(2),
            collateralTokenSymbol: "ZRX",
            collateralAmount: new BigNumber(1 * 10 ** 18),
            gracePeriodInDays: new BigNumber(5),
        };
    });
});
