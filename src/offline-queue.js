/**
 * offline-queue.js — IndexedDB Offline Queue with Background Sync
 * Module 4.3 — Frontend Integration Update
 *
 * Uses idb-keyval (loaded via unpkg CDN) for simple IndexedDB access.
 * Queues failed form submissions and retries on next page load.
 */
(function () {
  'use strict';

  var QUEUE_KEY = 'aira_submission_queue';
  var MAX_RETRIES = 5;

  /** Get the current queue from IndexedDB */
  function getQueue() {
    if (typeof idbKeyval === 'undefined') {
      return Promise.resolve([]);
    }
    return idbKeyval.get(QUEUE_KEY).then(function (q) { return q || []; });
  }

  /** Save the queue to IndexedDB */
  function saveQueue(queue) {
    if (typeof idbKeyval === 'undefined') {
      return Promise.resolve();
    }
    return idbKeyval.set(QUEUE_KEY, queue);
  }

  /** Push a failed submission to the queue */
  function push(payload) {
    return getQueue().then(function (queue) {
      queue.push({
        payload: payload,
        timestamp: Date.now(),
        retries: 0
      });
      return saveQueue(queue);
    });
  }

  /** Attempt to flush all pending submissions */
  function flush(submitFn) {
    return getQueue().then(function (queue) {
      if (!queue || queue.length === 0) return Promise.resolve();

      var remaining = [];
      var promises = queue.map(function (item) {
        if (item.retries >= MAX_RETRIES) {
          console.warn('[AIRA Queue] Max retries exceeded, dropping:', item.payload);
          return Promise.resolve();
        }

        return submitFn(item.payload).then(function () {
          console.log('[AIRA Queue] Successfully flushed queued submission.');
        }).catch(function () {
          item.retries++;
          // Exponential backoff marker
          item.lastAttempt = Date.now();
          remaining.push(item);
        });
      });

      return Promise.all(promises).then(function () {
        return saveQueue(remaining);
      });
    });
  }

  /** Get count of pending submissions */
  function count() {
    return getQueue().then(function (queue) { return queue.length; });
  }

  // Expose public API
  window.AiraQueue = {
    push: push,
    flush: flush,
    count: count
  };
})();
