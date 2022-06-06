import "@testing-library/jest-dom";
import "jest-canvas-mock";

/* still don't understand what was invoking the following, but nothing should,
and this makes the tag tests work correctly */
global.XMLHttpRequest = undefined;
global.setImmediate = global.setTimeout;
