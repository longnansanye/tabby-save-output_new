import { ConfigProvider } from 'tabby-core'
import { DEFAULT_FILENAME_TEMPLATE } from './util'

/** @hidden */
export class SaveOutputConfigProvider extends ConfigProvider {
    defaults = {
        saveOutput: {
            autoSave: 'off',
            autoSaveDirectory: null,
            filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
            insertTimestamps: false,
        },
    }

    platformDefaults = { }
}
