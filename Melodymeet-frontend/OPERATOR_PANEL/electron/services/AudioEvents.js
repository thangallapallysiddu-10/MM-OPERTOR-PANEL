const { BrowserWindow } = require('electron');

class AudioEvents {
    /**
     * Broadcasts a namespaced event to all active renderer windows.
     * @param {string} eventName - e.g. "deck:play"
     * @param {Object} data - the event payload
     */
    emit(eventName, data) {
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
            if (win && win.webContents) {
                win.webContents.send('audio-event', { eventName, data });
            }
        }
    }
}

module.exports = new AudioEvents();
