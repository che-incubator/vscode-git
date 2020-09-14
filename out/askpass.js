"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Askpass = void 0;
const vscode_1 = require("vscode");
const path = require("path");
class Askpass {
    constructor(ipc) {
        this.disposable = ipc.registerHandler('askpass', this);
    }
    static getDisabledEnv() {
        return {
            GIT_ASKPASS: path.join(__dirname, 'askpass-empty.sh')
        };
    }
    async handle({ request, host }) {
        const options = {
            password: /password/i.test(request),
            placeHolder: request,
            prompt: `Git: ${host}`,
            ignoreFocusOut: true
        };
        return await vscode_1.window.showInputBox(options) || '';
    }
    getEnv() {
        return {
            ELECTRON_RUN_AS_NODE: '1',
            GIT_ASKPASS: path.join(__dirname, 'askpass.sh'),
            VSCODE_GIT_ASKPASS_NODE: process.execPath,
            VSCODE_GIT_ASKPASS_MAIN: path.join(__dirname, 'askpass-main.js')
        };
    }
    dispose() {
        this.disposable.dispose();
    }
}
exports.Askpass = Askpass;
//# sourceMappingURL=askpass.js.map