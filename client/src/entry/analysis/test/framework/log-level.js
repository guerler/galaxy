const consoleDebug = console.debug;
const consoleInfo = console.info;
const consoleWarn = console.warn;

export function enableLogging() {
    console.debug = consoleDebug;
    console.info = consoleInfo;
    console.warn = consoleWarn;
}

export function disableLogging() {
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
}
