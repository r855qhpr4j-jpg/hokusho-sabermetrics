(function () {
  const config = window.HOKUSHO_SUPABASE_CONFIG || {};
  const dataKeys = window.AppCommon?.dataKeys || {};
  const managedKeys = [
    dataKeys.batting,
    dataKeys.pitching,
    dataKeys.catching,
    dataKeys.results
  ].filter(Boolean);

  const state = {
    enabled: Boolean(config.enabled && config.url && config.anonKey && window.supabase?.createClient),
    client: null,
    syncing: false,
    suppressPush: false,
    debounceHandle: null,
    lastSyncedAt: null,
    lastErrorMessage: ""
  };

  function dispatchStatus(status, extra) {
    window.dispatchEvent(new CustomEvent("hokusho:sync-status", {
      detail: {
        status,
        enabled: state.enabled,
        lastSyncedAt: state.lastSyncedAt,
        lastErrorMessage: state.lastErrorMessage,
        ...(extra || {})
      }
    }));
  }

  function getSnapshot() {
    return {
      batting: AppCommon.storage.load(dataKeys.batting, []),
      pitching: AppCommon.storage.load(dataKeys.pitching, []),
      catching: AppCommon.storage.load(dataKeys.catching, []),
      results: AppCommon.storage.load(dataKeys.results, [])
    };
  }

  function applySnapshot(snapshot) {
    state.suppressPush = true;
    try {
      AppCommon.storage.save(dataKeys.batting, Array.isArray(snapshot?.batting) ? snapshot.batting : []);
      AppCommon.storage.save(dataKeys.pitching, Array.isArray(snapshot?.pitching) ? snapshot.pitching : []);
      AppCommon.storage.save(dataKeys.catching, Array.isArray(snapshot?.catching) ? snapshot.catching : []);
      AppCommon.storage.save(dataKeys.results, Array.isArray(snapshot?.results) ? snapshot.results : []);
    } finally {
      state.suppressPush = false;
    }
    window.dispatchEvent(new CustomEvent("hokusho:remote-applied", { detail: { snapshot } }));
  }

  async function fetchRemoteSnapshot() {
    const { data, error } = await state.client
      .from(config.table)
      .select("scope, payload, updated_at")
      .eq("scope", config.scope)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function upsertRemoteSnapshot(reason) {
    if (!state.enabled || state.syncing) return;
    state.syncing = true;
    dispatchStatus("syncing", { reason });
    try {
      const payload = getSnapshot();
      const { error } = await state.client
        .from(config.table)
        .upsert({
          scope: config.scope,
          payload,
          updated_at: new Date().toISOString()
        }, { onConflict: "scope" });
      if (error) throw error;
      state.lastSyncedAt = new Date().toISOString();
      state.lastErrorMessage = "";
      dispatchStatus("synced", { reason });
    } catch (error) {
      state.lastErrorMessage = error.message || "sync failed";
      dispatchStatus("error", { reason, message: state.lastErrorMessage });
      console.error("Supabase sync failed:", error);
    } finally {
      state.syncing = false;
    }
  }

  async function pullRemoteSnapshot() {
    if (!state.enabled) return;
    dispatchStatus("loading");
    try {
      const row = await fetchRemoteSnapshot();
      if (row?.payload) {
        applySnapshot(row.payload);
        state.lastSyncedAt = row.updated_at || new Date().toISOString();
        state.lastErrorMessage = "";
        dispatchStatus("synced", { reason: "pull" });
      } else {
        await upsertRemoteSnapshot("bootstrap");
      }
    } catch (error) {
      state.lastErrorMessage = error.message || "pull failed";
      dispatchStatus("error", { reason: "pull", message: state.lastErrorMessage });
      console.error("Supabase pull failed:", error);
    }
  }

  function schedulePush(reason) {
    if (!state.enabled || state.suppressPush) return;
    window.clearTimeout(state.debounceHandle);
    state.debounceHandle = window.setTimeout(() => {
      upsertRemoteSnapshot(reason || "local-change");
    }, 700);
  }

  function installHeaderBadge() {
    const header = document.querySelector(".site-header");
    if (!header || document.querySelector(".sync-badge")) return;

    const badge = document.createElement("div");
    badge.className = "sync-badge";
    badge.textContent = state.enabled ? "Shared Sync: Loading" : "Shared Sync: Off";
    badge.title = "";
    header.appendChild(badge);

    badge.addEventListener("click", () => {
      if (state.lastErrorMessage) {
        window.alert(`Supabase error:\n${state.lastErrorMessage}`);
      }
    });

    window.addEventListener("hokusho:sync-status", (event) => {
      const detail = event.detail || {};
      if (!detail.enabled) {
        badge.textContent = "Shared Sync: Off";
        badge.title = "";
        return;
      }
      if (detail.status === "loading") badge.textContent = "Shared Sync: Loading";
      if (detail.status === "syncing") badge.textContent = "Shared Sync: Saving";
      if (detail.status === "synced") {
        badge.textContent = "Shared Sync: Connected";
        badge.title = "";
      }
      if (detail.status === "error") {
        badge.textContent = "Shared Sync: Error";
        badge.title = detail.message || detail.lastErrorMessage || "Supabase error";
      }
    });
  }

  function setupRealtime() {
    if (!state.enabled || !state.client.channel) return;
    state.client
      .channel("hokusho-shared-state")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: config.table,
        filter: `scope=eq.${config.scope}`
      }, async () => {
        await pullRemoteSnapshot();
      })
      .subscribe();
  }

  function init() {
    installHeaderBadge();

    if (!state.enabled) {
      dispatchStatus("disabled");
      window.dispatchEvent(new CustomEvent("hokusho:shared-ready", { detail: { enabled: false } }));
      return;
    }

    const { createClient } = window.supabase;
    state.client = createClient(config.url, config.anonKey);

    window.HOKUSHO_SUPABASE = {
      push: upsertRemoteSnapshot,
      pull: pullRemoteSnapshot
    };

    window.addEventListener("hokusho:storage-changed", (event) => {
      const key = event.detail?.key;
      if (!managedKeys.includes(key)) return;
      schedulePush("local-change");
    });

    pullRemoteSnapshot().then(() => {
      setupRealtime();
      window.dispatchEvent(new CustomEvent("hokusho:shared-ready", { detail: { enabled: true } }));
    });
  }

  init();
})();
