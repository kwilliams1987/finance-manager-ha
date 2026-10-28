import assert from "node:assert/strict";
import test from "node:test";

import { Recurrence } from "../custom_components/finances/www/js/model/recurrence.js";

test("converts legacy six- and twelve-month backup recurrence values", () => {
    assert.equal(Recurrence.fromBackup(6), Recurrence.biannually);
    assert.equal(Recurrence.fromBackup("6"), Recurrence.biannually);
    assert.equal(Recurrence.fromBackup(12), Recurrence.annually);
    assert.equal(Recurrence.fromBackup("12"), Recurrence.annually);
});

test("preserves current and unsupported recurrence values", () => {
    for (const recurrence of [
        Recurrence.never,
        Recurrence.monthly,
        Recurrence.bimonthly,
        Recurrence.quarterly,
        Recurrence.biannually,
        Recurrence.annually,
        99,
    ]) {
        assert.equal(Recurrence.fromBackup(recurrence), recurrence);
    }
});
