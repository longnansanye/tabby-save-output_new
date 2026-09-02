import * as os from 'os'
import stripAnsi from 'strip-ansi'
import { BaseTerminalTabComponent } from 'tabby-terminal'

const regex = /[\x08\x1b]((\[\??\d+[hl])|([=<>a-kzNM78])|([\(\)][a-b0-2])|(\[\d{0,2}\w)|(\[\d+;\d+[hfy]?)|(\[;?[hf])|(#[3-68])|([01356]n)|(O[mlnp-z]?)|(\/Z)|(\d+)|(\[\?\d;\d0c)|(\d;\dR))/gi

export function cleanupOutput (data: string): string {
    return stripAnsi(data.replace(regex, ''))
}

function pad (value: number, length = 2): string {
    return String(value).padStart(length, '0')
}

/** Format as yyyy-mm-dd HH:MM:SS.xxx */
export function formatLineTimestamp (date: Date = new Date()): string {
    return [
        date.getFullYear(),
        '-',
        pad(date.getMonth() + 1),
        '-',
        pad(date.getDate()),
        ' ',
        pad(date.getHours()),
        ':',
        pad(date.getMinutes()),
        ':',
        pad(date.getSeconds()),
        '.',
        pad(date.getMilliseconds(), 3),
    ].join('')
}

export interface LineTimestampState {
    atLineStart: boolean
}

/**
 * Prefix each line with a timestamp. Handles chunked terminal output by
 * tracking whether the next write begins a new line.
 */
export function prefixLineTimestamps (
    data: string,
    state: LineTimestampState,
    now: () => Date = () => new Date(),
): string {
    if (!data) {
        return data
    }

    let result = ''
    for (let i = 0; i < data.length; i++) {
        const ch = data[i]
        if (state.atLineStart) {
            result += `[${formatLineTimestamp(now())}] `
            state.atLineStart = false
        }
        result += ch
        if (ch === '\n') {
            state.atLineStart = true
        }
    }
    return result
}

/** Expand a subset of strftime tokens used by `date +FORMAT`. */
export function formatDate (format: string, date: Date = new Date()): string {
    const map: { [key: string]: string } = {
        '%Y': String(date.getFullYear()),
        '%y': pad(date.getFullYear() % 100),
        '%m': pad(date.getMonth() + 1),
        '%d': pad(date.getDate()),
        '%H': pad(date.getHours()),
        '%I': pad(date.getHours() % 12 || 12),
        '%M': pad(date.getMinutes()),
        '%S': pad(date.getSeconds()),
        '%s': String(Math.floor(date.getTime() / 1000)),
        '%F': `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        '%T': `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
        '%%': '%',
    }

    return format.replace(/%[YymdHIMSsFT%]/g, match => map[match] ?? match)
}

/**
 * Resolve the terminal/session host name (SSH/Telnet host, etc.),
 * not the local OS machine name.
 */
export function resolveTabHostname (tab: BaseTerminalTabComponent): string {
    const anyTab = tab as any
    const profile = anyTab.profile
    const options = profile?.options

    const candidates = [
        options?.host,
        options?.hostname,
        options?.address,
    ]

    for (const value of candidates) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim()
        }
    }

    // Titles often look like user@host or user@host:port
    const title = (tab.customTitle || tab.title || '').trim()
    const atMatch = title.match(/@([^:@\s\\/]+)/)
    if (atMatch?.[1]) {
        return atMatch[1]
    }

    if (typeof profile?.name === 'string' && profile.name.trim()) {
        return profile.name.trim()
    }

    if (title) {
        return title
    }

    return 'localhost'
}

export interface FilenameTemplateContext {
    title?: string
    hostname?: string
    localHostname?: string
    date?: Date
}

/**
 * Expand shell-like placeholders in a filename template.
 * Supported:
 *   $(date +FORMAT)  e.g. $(date +%Y%m%d%H%M%S)
 *   $(hostname)      terminal/session host (SSH host, etc.)
 *   $(localHostname) this computer's OS hostname
 *   $(title)
 */
export function expandFilenameTemplate (
    template: string,
    context: FilenameTemplateContext = {},
): string {
    const date = context.date ?? new Date()
    const hostname = context.hostname ?? 'localhost'
    const localHostname = context.localHostname ?? os.hostname()
    const title = context.title ?? 'Untitled'

    return template
        .replace(/\$\(date\s+\+([^)]+)\)/g, (_match, format: string) => formatDate(format.trim(), date))
        .replace(/\$\(hostname\)/g, hostname)
        .replace(/\$\(localHostname\)/g, localHostname)
        .replace(/\$\(title\)/g, title)
}

export const DEFAULT_FILENAME_TEMPLATE = '$(date +%Y%m%d%H%M%S)-$(hostname).log'
