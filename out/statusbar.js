"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBarCommands = void 0;
const vscode_1 = require("vscode");
const util_1 = require("./util");
const nls = require("vscode-nls");
const localize = nls.loadMessageBundle();
class CheckoutStatusBar {
    constructor(repository) {
        this.repository = repository;
        this._onDidChange = new vscode_1.EventEmitter();
        this.disposables = [];
        repository.onDidRunGitStatus(this._onDidChange.fire, this._onDidChange, this.disposables);
    }
    get onDidChange() { return this._onDidChange.event; }
    get command() {
        const rebasing = !!this.repository.rebaseCommit;
        const title = `$(git-branch) ${this.repository.headLabel}${rebasing ? ` (${localize('rebasing', 'Rebasing')})` : ''}`;
        return {
            command: 'git.checkout',
            tooltip: `${this.repository.headLabel}`,
            title,
            arguments: [this.repository.sourceControl]
        };
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
let SyncStatusBar = /** @class */ (() => {
    class SyncStatusBar {
        constructor(repository) {
            this.repository = repository;
            this._onDidChange = new vscode_1.EventEmitter();
            this.disposables = [];
            this._state = SyncStatusBar.StartState;
            repository.onDidRunGitStatus(this.onModelChange, this, this.disposables);
            repository.onDidChangeOperations(this.onOperationsChange, this, this.disposables);
            const onEnablementChange = util_1.filterEvent(vscode_1.workspace.onDidChangeConfiguration, e => e.affectsConfiguration('git.enableStatusBarSync'));
            onEnablementChange(this.updateEnablement, this, this.disposables);
            this.updateEnablement();
            this._onDidChange.fire();
        }
        get onDidChange() { return this._onDidChange.event; }
        get state() { return this._state; }
        set state(state) {
            this._state = state;
            this._onDidChange.fire();
        }
        updateEnablement() {
            const config = vscode_1.workspace.getConfiguration('git', vscode_1.Uri.file(this.repository.root));
            const enabled = config.get('enableStatusBarSync', true);
            this.state = { ...this.state, enabled };
        }
        onOperationsChange() {
            const isSyncRunning = this.repository.operations.isRunning("Sync" /* Sync */) ||
                this.repository.operations.isRunning("Push" /* Push */) ||
                this.repository.operations.isRunning("Pull" /* Pull */);
            this.state = { ...this.state, isSyncRunning };
        }
        onModelChange() {
            this.state = {
                ...this.state,
                hasRemotes: this.repository.remotes.length > 0,
                HEAD: this.repository.HEAD
            };
        }
        get command() {
            if (!this.state.enabled || !this.state.hasRemotes) {
                return undefined;
            }
            const HEAD = this.state.HEAD;
            let icon = '$(sync)';
            let text = '';
            let command = '';
            let tooltip = '';
            if (HEAD && HEAD.name && HEAD.commit) {
                if (HEAD.upstream) {
                    if (HEAD.ahead || HEAD.behind) {
                        text += this.repository.syncLabel;
                    }
                    const config = vscode_1.workspace.getConfiguration('git', vscode_1.Uri.file(this.repository.root));
                    const rebaseWhenSync = config.get('rebaseWhenSync');
                    command = rebaseWhenSync ? 'git.syncRebase' : 'git.sync';
                    tooltip = localize('sync changes', "Synchronize Changes");
                }
                else {
                    icon = '$(cloud-upload)';
                    command = 'git.publish';
                    tooltip = localize('publish changes', "Publish Changes");
                }
            }
            else {
                command = '';
                tooltip = '';
            }
            if (this.state.isSyncRunning) {
                icon = '$(sync~spin)';
                command = '';
                tooltip = localize('syncing changes', "Synchronizing Changes...");
            }
            return {
                command,
                title: [icon, text].join(' ').trim(),
                tooltip,
                arguments: [this.repository.sourceControl]
            };
        }
        dispose() {
            this.disposables.forEach(d => d.dispose());
        }
    }
    SyncStatusBar.StartState = {
        enabled: true,
        isSyncRunning: false,
        hasRemotes: false,
        HEAD: undefined
    };
    return SyncStatusBar;
})();
class StatusBarCommands {
    constructor(repository) {
        this.disposables = [];
        this.syncStatusBar = new SyncStatusBar(repository);
        this.checkoutStatusBar = new CheckoutStatusBar(repository);
    }
    get onDidChange() {
        return util_1.anyEvent(this.syncStatusBar.onDidChange, this.checkoutStatusBar.onDidChange);
    }
    get commands() {
        const result = [];
        const checkout = this.checkoutStatusBar.command;
        if (checkout) {
            result.push(checkout);
        }
        const sync = this.syncStatusBar.command;
        if (sync) {
            result.push(sync);
        }
        return result;
    }
    dispose() {
        this.syncStatusBar.dispose();
        this.checkoutStatusBar.dispose();
        this.disposables = util_1.dispose(this.disposables);
    }
}
exports.StatusBarCommands = StatusBarCommands;
//# sourceMappingURL=statusbar.js.map