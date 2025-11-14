const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');

/**
 * Worker Pool Manager
 * Manages a pool of worker threads for CPU-intensive operations
 * Prevents blocking the main event loop while maximizing CPU utilization
 */
class WorkerPool {
  constructor(workerScript, poolSize = null) {
    this.workerScript = workerScript;
    // Default pool size: number of CPU cores - 1 (leave one for main thread)
    this.poolSize = poolSize || Math.max(1, os.cpus().length - 1);
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.taskIdCounter = 0;
    this.pendingTasks = new Map();

    console.log(`🔧 Initializing Worker Pool with ${this.poolSize} workers for ${path.basename(workerScript)}`);
    this.initializeWorkers();
  }

  initializeWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript);

      worker.on('message', (result) => {
        this.handleWorkerMessage(worker, result);
      });

      worker.on('error', (error) => {
        console.error(`Worker ${i} error:`, error);
        // Remove failed worker and create a new one
        this.removeWorker(worker);
        this.addWorker();
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker ${i} exited with code ${code}`);
          this.removeWorker(worker);
          this.addWorker();
        }
      });

      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  addWorker() {
    const worker = new Worker(this.workerScript);

    worker.on('message', (result) => {
      this.handleWorkerMessage(worker, result);
    });

    worker.on('error', (error) => {
      console.error('Worker error:', error);
      this.removeWorker(worker);
      this.addWorker();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker exited with code ${code}`);
        this.removeWorker(worker);
        this.addWorker();
      }
    });

    this.workers.push(worker);
    this.availableWorkers.push(worker);
  }

  removeWorker(worker) {
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex > -1) {
      this.workers.splice(workerIndex, 1);
    }

    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex > -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }
  }

  handleWorkerMessage(worker, result) {
    const { taskId, success, text, error } = result;
    const task = this.pendingTasks.get(taskId);

    if (!task) {
      console.error(`Received result for unknown task ${taskId}`);
      return;
    }

    // Remove task from pending
    this.pendingTasks.delete(taskId);

    // Return worker to available pool
    this.availableWorkers.push(worker);

    // Resolve or reject the task promise
    if (success) {
      task.resolve(text);
    } else {
      task.reject(new Error(error.message));
    }

    // Process next task in queue if any
    this.processNextTask();
  }

  processNextTask() {
    if (this.taskQueue.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    const task = this.taskQueue.shift();
    const worker = this.availableWorkers.shift();

    this.pendingTasks.set(task.taskId, task);
    worker.postMessage({
      taskId: task.taskId,
      buffer: task.data.buffer,
      mimeType: task.data.mimeType
    });
  }

  /**
   * Execute a task in the worker pool
   * @param {Object} data - Task data to send to worker
   * @returns {Promise} Promise that resolves with the task result
   */
  execute(data) {
    return new Promise((resolve, reject) => {
      const taskId = this.taskIdCounter++;
      const task = {
        taskId,
        data,
        resolve,
        reject,
        createdAt: Date.now()
      };

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      poolSize: this.poolSize,
      activeWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.workers.length - this.availableWorkers.length,
      queuedTasks: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size
    };
  }

  /**
   * Terminate all workers in the pool
   */
  async terminate() {
    console.log('🛑 Terminating Worker Pool...');
    const terminationPromises = this.workers.map(worker => worker.terminate());
    await Promise.all(terminationPromises);
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.pendingTasks.clear();
    console.log('✅ Worker Pool terminated');
  }
}

module.exports = WorkerPool;
