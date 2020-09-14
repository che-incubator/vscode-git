"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIPCServer = void 0;
const util_1 = require("../util");
const path = require("path");
const http = require("http");
const os = require("os");
const fs = require("fs");
const crypto = require("crypto");
function getIPCHandlePath(nonce) {
    if (process.platform === 'win32') {
        return `\\\\.\\pipe\\vscode-git-ipc-${nonce}-sock`;
    }
    if (process.env['XDG_RUNTIME_DIR']) {
        return path.join(process.env['XDG_RUNTIME_DIR'], `vscode-git-ipc-${nonce}.sock`);
    }
    return path.join(os.tmpdir(), `vscode-git-ipc-${nonce}.sock`);
}
async function createIPCServer() {
    const server = http.createServer();
    const buffer = await new Promise((c, e) => crypto.randomBytes(20, (err, buf) => err ? e(err) : c(buf)));
    const nonce = buffer.toString('hex');
    const ipcHandlePath = getIPCHandlePath(nonce);
    return new Promise((c, e) => {
        try {
            server.on('error', err => e(err));
            server.listen(ipcHandlePath);
            c(new IPCServer(server, ipcHandlePath));
        }
        catch (err) {
            e(err);
        }
    });
}
exports.createIPCServer = createIPCServer;
class IPCServer {
    constructor(server, _ipcHandlePath) {
        this.server = server;
        this._ipcHandlePath = _ipcHandlePath;
        this.handlers = new Map();
        this.server.on('request', this.onRequest.bind(this));
    }
    get ipcHandlePath() { return this._ipcHandlePath; }
    registerHandler(name, handler) {
        this.handlers.set(`/${name}`, handler);
        return util_1.toDisposable(() => this.handlers.delete(name));
    }
    onRequest(req, res) {
        if (!req.url) {
            console.warn(`Request lacks url`);
            return;
        }
        const handler = this.handlers.get(req.url);
        if (!handler) {
            console.warn(`IPC handler for ${req.url} not found`);
            return;
        }
        const chunks = [];
        req.on('data', d => chunks.push(d));
        req.on('end', () => {
            const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            handler.handle(request).then(result => {
                res.writeHead(200);
                res.end(JSON.stringify(result));
            }, () => {
                res.writeHead(500);
                res.end();
            });
        });
    }
    getEnv() {
        return { VSCODE_GIT_IPC_HANDLE: this.ipcHandlePath };
    }
    dispose() {
        this.handlers.clear();
        this.server.close();
        if (this._ipcHandlePath && process.platform !== 'win32') {
            fs.unlinkSync(this._ipcHandlePath);
        }
    }
}
//# sourceMappingURL=ipcServer.js.map