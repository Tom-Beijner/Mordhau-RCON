"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromiseQueue = void 0;
class PromiseQueue {
    constructor(maxConcurrent = 1) {
        this.maxConcurrent = maxConcurrent;
        this.paused = false;
        this.queue = [];
        this.pendingPromiseCount = 0;
    }
    async add(promiseGenerator) {
        return new Promise((resolve, reject) => {
            this.queue.push({ promiseGenerator, resolve, reject });
            this.dequeue();
        });
    }
    pause() {
        this.paused = true;
    }
    resume() {
        this.paused = false;
        this.dequeue();
    }
    async dequeue() {
        if (this.paused || this.pendingPromiseCount >= this.maxConcurrent)
            return;
        const item = this.queue.shift();
        if (!item)
            return;
        this.pendingPromiseCount++;
        try {
            const value = await item.promiseGenerator();
            item.resolve(value);
        }
        catch (error) {
            item.reject(error);
        }
        finally {
            this.pendingPromiseCount--;
            this.dequeue();
        }
    }
}
exports.PromiseQueue = PromiseQueue;
