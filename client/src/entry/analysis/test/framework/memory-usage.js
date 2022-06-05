import process from "process";

export class MemoryUsage {
    constructor() {
        this.initial = this.getUsage();
    }
    getUsage() {
        const usage = process.memoryUsage();
        const mb = 1024 * 1024;
        return Math.round(usage.heapUsed / mb);
    }
    getDelta() {
        const current = this.getUsage();
        return current - this.initial;
    }
    log() {
        console.log(`Memory: ${this.getDelta()}.`);
    }
}
