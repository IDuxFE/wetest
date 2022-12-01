export  async function useInit () {
    window.__wetest_cfg = await window.__wetest_getwetestCfg()
}