// src/stateMgr.ts
import assert from "node:assert";
import StateMgr from "@j-cake/jcake-utils/state";
assert.equal(typeof StateMgr, "function");
assert.equal(typeof StateMgr.prototype.constructor, "function");
var mgr = new StateMgr({ name: "test" });
assert.equal(typeof mgr, "object");
assert.ok(mgr instanceof StateMgr);
assert.equal(mgr.get().name, "test");
assert.equal(mgr.get(), mgr.setState());
//# sourceMappingURL=state.js.map
