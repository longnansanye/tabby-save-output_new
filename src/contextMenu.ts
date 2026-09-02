import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import sanitizeFilename from 'sanitize-filename'
import { Injectable } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import { ConfigService, MenuItemOptions } from 'tabby-core'
import { ElectronService, ElectronHostWindow } from 'tabby-electron'
import { BaseTerminalTabComponent, TerminalContextMenuItemProvider } from 'tabby-terminal'
import {
    cleanupOutput,
    DEFAULT_FILENAME_TEMPLATE,
    expandFilenameTemplate,
    LineTimestampState,
    prefixLineTimestamps,
    resolveTabHostname,
} from './util'

import './styles.scss'

interface SaveOutputState {
    stream: fs.WriteStream
    subscription: { unsubscribe (): void }
    ui: HTMLElement
    path: string
}

@Injectable()
export class SaveOutputContextMenu extends TerminalContextMenuItemProvider {
    weight = 1

    constructor (
        private toastr: ToastrService,
        private electron: ElectronService,
        private hostWindow: ElectronHostWindow,
        private config: ConfigService,
    ) {
        super()
    }

    async getItems (tab: BaseTerminalTabComponent): Promise<MenuItemOptions[]> {
        const active = !!(tab as any)._saveOutputActive

        if (active) {
            return [
                {
                    label: 'Stop recording output',
                    click: () => {
                        setTimeout(() => this.stop(tab))
                    },
                },
            ]
        }

        return [
            {
                label: 'Start recording output',
                click: () => {
                    setTimeout(() => this.start(tab))
                },
            },
            {
                label: 'Save output to file...',
                click: () => {
                    setTimeout(() => this.start(tab, true))
                },
            },
        ]
    }

    private resolveOutputPath (tab: BaseTerminalTabComponent, askPath: boolean): string | null {
        const directory = this.config.store.saveOutput.autoSaveDirectory || os.homedir()
        const defaultName = this.buildFilename(tab)
        const suggestedPath = path.join(directory, defaultName)

        if (askPath) {
            const selected = this.electron.dialog.showSaveDialogSync(
                this.hostWindow.getWindow(),
                { defaultPath: suggestedPath },
            )
            return selected || null
        }

        return suggestedPath
    }

    private buildFilename (tab: BaseTerminalTabComponent): string {
        const template = this.config.store.saveOutput.filenameTemplate || DEFAULT_FILENAME_TEMPLATE
        const expanded = expandFilenameTemplate(template, {
            title: tab.customTitle || tab.title || 'Untitled',
            hostname: resolveTabHostname(tab),
        })
        return sanitizeFilename(expanded) || DEFAULT_FILENAME_TEMPLATE.replace(/[^\w.-]+/g, '_')
    }

    start (tab: BaseTerminalTabComponent, askPath = false) {
        if ((tab as any)._saveOutputActive) {
            return
        }

        const outputPath = this.resolveOutputPath(tab, askPath)
        if (!outputPath) {
            return
        }

        try {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true })
        } catch {
            // Directory may already exist or be unavailable; write will surface errors.
        }

        let ui: HTMLElement = document.createElement('div')
        ui.classList.add('save-output-ui')
        tab.element.nativeElement.querySelector('.content').appendChild(ui)
        ui.innerHTML = require('./ui.pug')

        const nameEl = ui.querySelector('.save-output-path')
        if (nameEl) {
            nameEl.textContent = path.basename(outputPath)
            nameEl.setAttribute('title', outputPath)
        }

        let stream: fs.WriteStream
        try {
            stream = fs.createWriteStream(outputPath)
        } catch (err) {
            tab.element.nativeElement.querySelector('.content').removeChild(ui)
            this.toastr.error(`Failed to open log file: ${err}`)
            return
        }

        const insertTimestamps = !!this.config.store.saveOutput.insertTimestamps
        const timestampState: LineTimestampState = { atLineStart: true }

        let subscription = tab.output$.subscribe(data => {
            data = cleanupOutput(data)
            if (insertTimestamps) {
                data = prefixLineTimestamps(data, timestampState)
            }
            stream.write(data, 'utf8')
        })

        const state: SaveOutputState = { stream, subscription, ui, path: outputPath }
        ;(tab as any)._saveOutputActive = true
        ;(tab as any)._saveOutputState = state

        ui.querySelector('button')!.addEventListener('click', () => {
            this.stop(tab)
        })

        this.toastr.info(`Recording to ${path.basename(outputPath)}`)
    }

    stop (tab: BaseTerminalTabComponent) {
        const state: SaveOutputState | undefined = (tab as any)._saveOutputState
        if (!state && !(tab as any)._saveOutputActive) {
            return
        }

        ;(tab as any)._saveOutputActive = false
        ;(tab as any)._saveOutputState = null

        if (state) {
            if (state.ui.parentElement) {
                state.ui.parentElement.removeChild(state.ui)
            }
            state.subscription.unsubscribe()
            state.stream.end()
            this.toastr.info(`File saved: ${path.basename(state.path)}`)
        }
    }
}
