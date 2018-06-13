// Types
import { DebtOrder, DebtOrderParams, FillParameters } from "../../../../src/debt_order";
import { Address } from "../../../../src/types";

// Import Dharma for typing-checking.
import { Dharma } from "../../../../src";

// Test utils
import { ACCOUNTS } from "../../../accounts";

export async function testFill(dharma: Dharma, params: DebtOrderParams) {
    let debtOrder: DebtOrder;
    const creditor = ACCOUNTS[2];
    const fillParameters: FillParameters = {
        creditorAddress: new Address(creditor.address),
    };

    beforeAll(async () => {
        debtOrder = await DebtOrder.create(dharma, params);
    });

    test("calls Dharma#OrderAPI#fillAsync", async () => {
        const spy = jest.spyOn(dharma.order, "fillAsync");
        // jest#spyOn seems to have issues with mocking async functions by default
        // tslint:disable-next-line
        spy.mockImplementation(async () => {});

        await debtOrder.fill(fillParameters);
        expect(spy).toBeCalled();

        spy.mockReset();
        spy.mockRestore();
    });
}
