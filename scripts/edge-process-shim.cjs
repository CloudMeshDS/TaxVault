// Used only in the Edge Function bundle (see build-edge.mjs). Bundled CommonJS packages do
// `__importStar(require("process"))`, which copies own properties; Deno's process keeps `env`
// elsewhere, so the copy loses it. Marking this as an ES module makes __importStar return the
// real process object unchanged.
const p = globalThis.process;
module.exports = new Proxy(p, {
  get(target, key) {
    if (key === '__esModule') return true;
    if (key === 'default') return target;
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
