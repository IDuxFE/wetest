<script setup>
import { defineProps, ref } from 'vue'
import { NCollapse, NCollapseItem, NEllipsis, NCard } from 'naive-ui'
import { store } from '@/store/index'

const props = defineProps({
  testInfo: Object,
})

const emits = defineEmits(['show-detail'])

const isTestFail = props.testInfo.status === 'fail'

const baseURL = new URL('.', location.href).toString()
const viewURL = new URL('.', baseURL)
viewURL.pathname += 'traceViewer/index.html'
viewURL.searchParams.append('trace', `${baseURL}traceData/${props.testInfo.testId}.zip`)
const traceViewerUrl = viewURL.toString()

function goDetail() {
  emits('show-detail', props.testInfo)
}
</script>
  
<template>
  <NCollapse class="home-view_testInfo-nc" :class="[isTestFail ? 'border-red' : 'border-green']">
    <NCollapseItem :title="props.testInfo.name">
      <div v-if="isTestFail">
        <NCard v-for="error in props.testInfo.errors" :key="error" class="home-view_testInfo-error-card">
          {{ error }}
        </NCard>
      </div>

      <template #header>
        <NEllipsis style="width: 350px">{{ props.testInfo.name }}</NEllipsis>

        <div class="home-view_testInfo-status" :class="props.testInfo.status">
          {{ props.testInfo.status }}
        </div>

        <span class="link" @click.stop="goDetail">查看详情</span>

        <a target="_blank" :href="traceViewerUrl" v-if="isTestFail" class="home-view_trace-link" @click.stop>快速定位错误（推荐）</a>
      </template>

      <template #header-extra> {{ (props.testInfo.endTime - props.testInfo.startTime) / 1000 }} s </template>
    </NCollapseItem>
  </NCollapse>
</template>
  
<style>
.link {
  color: #365fd9ff;
  text-decoration: none;
  cursor: pointer;
}
.home-view_testInfo-nc {
  padding: 12px;
  border-radius: 8px;
}

.home-view_testInfo-status {
  width: 48px;
  margin-left: 12px;
  margin-right: 12px;
  padding: 0 8px;
  text-align: center;
}

.home-view_testInfo-error-card {
  color: rgb(236, 82, 82);
}

.home-view_trace-link {
  margin-left: 12px;
}
</style>
  