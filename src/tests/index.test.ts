import mongoose from "mongoose";
import ApiFetcher from "../api/fetch";
import "../index";
import { getRandomClient } from "../integration/tc models/client/client";
import { DB_URI, Log } from "../util";

beforeAll(async () => {
    try {
        await mongoose.connect(DB_URI);
    } catch (e) {
        Log.error(e);
    }
});

describe("testing index file", () => {
    test("three minus three should be zero", async () => {
        const client = await getRandomClient();
        Log.debug(client);
        expect(3 - 3).toBe(0);
    });
});


afterAll(() => {
    mongoose.disconnect();
    ApiFetcher.kill();
});
