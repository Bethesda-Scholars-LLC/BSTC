import "../index";
import { mongoConnected } from "../index";
import { getRandomClient } from "../integration/tc models/client/client";

describe("testing index file", () => {
    test("three minus three should be zero", async () => {
        await mongoConnected();
        await getRandomClient();
        expect(3 - 3).toBe(0);
    });
});
