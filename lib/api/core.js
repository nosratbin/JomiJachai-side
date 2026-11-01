import { checkSale, logCheck, registerSale, logVerification, importSync, issueNotice, recordTaxPayment, advanceErosion, recordBorga, settleKhas, issueCard } from "../register";

export function createRegisterApi(adapter) {
  let state = null;
  let status = "idle";
  let error = null;
  const listeners = new Set();
  const snapshot = () => ({ state, status, error, backend: adapter.name, shared: adapter.shared });
  let snap = snapshot();
  const emit = () => {
    snap = snapshot();
    listeners.forEach((l) => l());
  };

  let queue = Promise.resolve();
  function enqueue(task) {
    const run = queue.then(task);
    queue = run.catch(() => {});
    return run;
  }

  async function reload() {
    try {
      state = await adapter.load();
      status = "ready";
      error = null;
    } catch (e) {
      if (!state) status = "error";
      error = String(e?.message || e);
    }
    emit();
  }

  function commit(change) {
    return enqueue(async () => {
      if (!state) throw new Error("The register is not loaded yet");
      const prev = state;
      const { state: next, value } = await change(prev);
      state = next;
      emit();
      try {
        await adapter.save(prev, next);
      } catch (e) {
        await reload();
        throw e;
      }
      return value;
    });
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snap,

    start() {
      if (status !== "idle") return;
      status = "loading";
      emit();
      enqueue(reload)
        .then(() => adapter.watch?.(() => enqueue(reload)))
        .catch(() => {});
    },

    runChecks(input, officer) {
      return commit((s) => {
        const check = checkSale(s, input);
        return { state: logCheck(s, input, check, officer), value: check };
      });
    },

    registerSale(input, officer) {
      return commit(async (s) => {
        const { state: next, deed } = await registerSale(s, input, officer);
        return { state: next, value: deed };
      });
    },

    recordVerification(deedNo, result) {
      return commit((s) => ({ state: logVerification(s, deedNo, result), value: result }));
    },

    // Land services (each also writes a line to the activity log)
    issueNotice(input, officer) {
      return commit((s) => issueNotice(s, input, officer));
    },
    recordTaxPayment(plotId, officer) {
      return commit((s) => recordTaxPayment(s, plotId, officer));
    },
    advanceErosion(plotId, officer, extra) {
      return commit((s) => advanceErosion(s, plotId, officer, extra));
    },
    recordBorga(input, officer) {
      return commit((s) => recordBorga(s, input, officer));
    },
    settleKhas(input, officer) {
      return commit((s) => settleKhas(s, input, officer));
    },
    issueCard(person, officer) {
      return commit((s) => issueCard(s, person, officer));
    },

    importSyncLink(payload) {
      return commit((s) => {
        const { state: next, added } = importSync(s, payload);
        return { state: next, value: added };
      });
    },

    reset() {
      return enqueue(async () => {
        state = await adapter.reset();
        status = "ready";
        emit();
      });
    },
  };
}
