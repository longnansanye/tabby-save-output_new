/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { ConfigService } from 'tabby-core'
import { ElectronHostWindow, ElectronService } from 'tabby-electron'
import { DEFAULT_FILENAME_TEMPLATE, expandFilenameTemplate } from './util'

/** @hidden */
@Component({
    template: require('./settingsTab.component.pug'),
})
export class SaveOutputSettingsTabComponent {
    constructor (
        public config: ConfigService,
        private electron: ElectronService,
        private hostWindow: ElectronHostWindow,
    ) { }

    get previewFilename (): string {
        const template = this.config.store.saveOutput.filenameTemplate || DEFAULT_FILENAME_TEMPLATE
        return expandFilenameTemplate(template)
    }

    async pickDirectory (): Promise<void> {
        const paths = (await this.electron.dialog.showOpenDialog(
            this.hostWindow.getWindow(),
            {
                properties: ['openDirectory', 'showHiddenFiles'],
            }
        )).filePaths
        if (paths[0]) {
            this.config.store.saveOutput.autoSaveDirectory = paths[0]
            this.config.save()
        }
    }

}
