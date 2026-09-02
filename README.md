# Save Output

#### For the Tabby terminal

This plugin lets you stream console output into a file.

![](https://github.com/Eugeny/tabby-save-output/raw/master/screenshot.png)
<img width="938" height="437" alt="image" src="https://github.com/user-attachments/assets/16ff9430-1bb7-4c43-bdbe-9ade03cdf088" />

## Usage

- Right-click a terminal tab ¡ú **Start recording output** to begin logging to the configured directory and filename template.
- Click **Stop** on the overlay (or right-click ¡ú **Stop recording output**) to finish.
- **Save output to file...** still opens a save dialog when you want to pick a path manually.

## Settings

In **Settings ¡ú Save Output** you can configure:

| Setting | Description |
| --- | --- |
| Output directory | Destination folder for manual and automatic recordings |
| Filename template | Pattern used when creating log files |
| Insert line timestamps | Prefix each log line with `yyyy-mm-dd HH:MM:SS.xxx` |

Supported placeholders in the filename template:

- `$(date +FORMAT)` ¡ª e.g. `$(date +%Y%m%d%H%M%S)` or `$(date +%Y%m%S)`
- `$(hostname)` ¡ª terminal/session host (SSH host, etc.), not the local PC name
- `$(localHostname)` ¡ª this computer's OS hostname
- `$(title)` ¡ª terminal tab title

Default template: `$(date +%Y%m%d%H%M%S)-$(hostname).log`

When timestamps are enabled, each line looks like:

```
[2026-08-13 10:56:01.123] ls -la
[2026-08-13 10:56:01.145] total 12
```
