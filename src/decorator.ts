import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import sanitizeFilename from 'sanitize-filename'
import { Injectable } from '@angular/core'
import { ConfigService } from 'tabby-core'
import { TerminalDecorator, BaseTerminalTabComponent, BaseSession } from 'tabby-terminal'
import { SSHTabComponent } from 'tabby-ssh'
import {
    cleanupOutput,
    DEFAULT_FILENAME_TEMPLATE,
    expandFilenameTemplate,
    LineTimestampState,
    prefixLineTimestamps,
    resolveTabHostname,
} from './util'

@Injectable()
export class SaveOutputDecorator extends TerminalDecorator {
    constructor (
        private config: ConfigService,
    ) {
        super()
    }

    attach (tab: BaseTerminalTabComponent): void {
        if (this.config.store.saveOutput.autoSave === 'off' || this.config.store.saveOutput.autoSave === 'ssh' && !(tab instanceof SSHTabComponent)) {
            return
        }

        if (tab.sessionChanged$) { // v136+
            tab.sessionChanged$.subscribe(session => {
                if (session) {
                    this.attachToSession(session, tab)
                }
            })
        }
        if (tab.session) {
            this.attachToSession(tab.session, tab)
        }
    }

    private attachToSession (session: BaseSession, tab: BaseTerminalTabComponent) {
        const startedAt = new Date()
        let outputPath = this.generatePath(tab, startedAt)
        try {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true })
        } catch {
            // Best-effort; write stream will fail if path is invalid.
        }

        const stream = fs.createWriteStream(outputPath)
        let dataLength = 0
        const insertTimestamps = !!this.config.store.saveOutput.insertTimestamps
        const timestampState: LineTimestampState = { atLineStart: true }

        // wait for the title to settle
        setTimeout(() => {
            let newPath = this.generatePath(tab, startedAt)
            if (newPath === outputPath) {
                return
            }
            fs.rename(outputPath, newPath, err => {
                if (!err) {
                    outputPath = newPath
                }
            })
        }, 5000)

        session.output$.subscribe(data => {
            data = cleanupOutput(data)
            if (insertTimestamps) {
                data = prefixLineTimestamps(data, timestampState)
            }
            dataLength += data.length
            stream.write(data, 'utf8')
        })

        session.destroyed$.subscribe(() => {
            stream.close()
            if (!dataLength) {
                fs.unlink(outputPath, () => null)
            }
        })
    }

    private generatePath (tab: BaseTerminalTabComponent, date: Date = new Date()): string {
        let outputPath = this.config.store.saveOutput.autoSaveDirectory || os.homedir()
        const template = this.config.store.saveOutput.filenameTemplate || DEFAULT_FILENAME_TEMPLATE
        let outputName = expandFilenameTemplate(template, {
            title: tab.customTitle || tab.title || 'Untitled',
            hostname: resolveTabHostname(tab),
            date,
        })
        outputName = sanitizeFilename(outputName)
        return path.join(outputPath, outputName)
    }
}
