<script setup>
import { NCollapse, NCollapseItem, NEllipsis, NCard, NPageHeader } from 'naive-ui'

const props = defineProps({
  testInfo: Object,
})

const steps = props.testInfo.steps

const baseURL = new URL('.', location.href).toString()
const viewURL = new URL('.', baseURL)
viewURL.pathname += 'traceViewer/index.html'
viewURL.searchParams.append('trace', `${baseURL}traceData/${props.testInfo.testId}.zip`)
const traceViewerUrl = viewURL.toString()
const isTestFail = props.testInfo.status === 'fail'

function isFailStep(status) {
  return status === 'fail'
}
</script>

<template>
  <NPageHeader>
    <template #extra>
      <a target="_blank" :href="traceViewerUrl" v-if="isTestFail">快速定位错误（推荐）</a>
    </template>
    <NCollapse class="test-view_nc">
      <NCollapseItem v-for="step in steps" :key="step.stepId">
        <NCard v-if="step.error" class="test-view_error-card">
          {{ step.error }}
        </NCard>
        <template #header>
          <NEllipsis style="width: 600px">{{ step.title }}</NEllipsis>
          <div class="test-view_step-status" :class="step.status">
            {{ step.status }}
          </div>
        </template>

        <template #header-extra> {{ step.endTime - step.startTime }} ms </template>
      </NCollapseItem>
    </NCollapse>
  </NPageHeader>
</template>
  
<style scoped>
.test-view_step-status {
  width: 48px;
  text-align: center;
  margin-left: 24px;
  padding: 0 8px;
}

.test-view_error-card {
  color: red;
}
</style>
  