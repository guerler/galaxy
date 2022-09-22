/** Adds window manager **/
import WinBox from "winbox/src/js/winbox.js";
import "winbox/dist/css/winbox.min.css";
import { safePath } from "utils/redirect";

export class WindowManager {
    constructor() {
        this.counter = 0;
    }

    /** Add and display a new window based on options. */
    add(options) {
        const url = safePath(options.url);
        this.counter++;
        const boxUrl = this._build_url(url, { hide_panels: true, hide_masthead: true });
        WinBox.new({
            title: options.title || "Window",
            url: boxUrl,
            onclose: () => {
                this.counter--;
            },
        });
    }

    /** Called before closing all windows. */
    beforeUnload() {
        return this.counter > 0;
    }

    /** Url helper */
    _build_url(url, options) {
        if (url) {
            url += url.indexOf("?") == -1 ? "?" : "&";
            Object.entries(options).forEach(([key, value]) => {
                url += `${key}=${value}&`;
            });
            return url;
        }
    }
}
