
import { useDialog } from 'naive-ui'
import { h, ref } from 'vue'
import WaitTime from '../../components/action/waitTime'

export function useWaitTimeDialog() {
    const dialog = useDialog()

    return function () {
        const formData = ref({
            time: 300
        })

        return new Promise<typeof formData.value>((resolve, reject) => {
            dialog.info({
                showIcon: false,
                content: () => h(WaitTime, {
                    data: formData.value
                }),
                positiveText: '确认',
                onNegativeClick: reject,
                onPositiveClick() {
                    resolve(formData.value)
                    return true
                }
            })
        })
    }
}
