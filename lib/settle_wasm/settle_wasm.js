/* @ts-self-types="./settle_wasm.d.ts" */
import * as wasm from "./settle_wasm_bg.wasm";
import { __wbg_set_wasm } from "./settle_wasm_bg.js";

__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
export {
    calculateSettlements
} from "./settle_wasm_bg.js";
