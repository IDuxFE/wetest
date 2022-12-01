import { reactive } from 'vue'

export const store = reactive({
  testInfo: {},
  setTestInfo(testInfo) {
    this.testInfo = testInfo
  }
})