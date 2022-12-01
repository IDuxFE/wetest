<script setup>
import { NInput, NRadioGroup, NRadioButton, NDrawer, NDrawerContent } from 'naive-ui'
import TestOverCard from '@/components/home/TestOverCard.vue'
import TestView from './TestView.vue'
import { reactive, ref, computed } from 'vue'

const testCollectInfo = ref(window.wetestReportJson)
const curTestInfo = ref({})
const curTestType = ref('all')
const keyword = ref('')
const detail = ref(false)
const overviewBtnCfg = reactive([
  {
    value: 'all',
    label: '全部',
  },
  {
    value: 'pass',
    label: '通过',
  },
  {
    value: 'fail',
    label: '失败',
  },
])

const testList = computed(() => {
  let testInfos = testCollectInfo.value.testInfos

  return testInfos.filter(test => {
    // 用例执行状态
    let status = curTestType.value === 'all' || test.status === curTestType.value
    // 关键字搜索
    let keywordSearch = test.name?.toLowerCase().includes(keyword.value.trim().toLowerCase())
    return status && keywordSearch
  })
})

const showDetail = info => {
  detail.value = true
  curTestInfo.value = info
}
</script>

<template>
  <div class="home-view_wrap">
    <div class="home-view_header">
      <NInput v-model:value="keyword" class="home-view_search-input" clearable size="large"></NInput>

      <div class="home-view_overview">
        <NRadioGroup size="large" v-model:value="curTestType">
          <NRadioButton v-for="btn in overviewBtnCfg" :key="btn.value" :value="btn.value" :label="btn.label">
            {{ btn.label }}
            ({{ testCollectInfo[btn.value] }})
          </NRadioButton>
        </NRadioGroup>
      </div>
    </div>

    <TestOverCard
      class="home-view_test-Card"
      v-for="testInfo in testList"
      :key="testInfo.testId"
      :testInfo="testInfo"
      @show-detail="showDetail"
    ></TestOverCard>

    <NDrawer class="detail-drawer" v-model:show="detail" width="880" placement="right">
      <NDrawerContent :title="curTestInfo.name" closable>
        <TestView :test-info="curTestInfo"></TestView>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style>
.detail-drawer {
  height: 100vh;
}
</style>
<style scoped>
.home-view_header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 48px;
}

.home-view_search-input {
  flex: 2 1 85%;
}

.home-view_overview {
  flex: 1 0 260px;
  text-align: right;
}

.home-view_test-Card {
  margin-bottom: 24px;
}
</style>
