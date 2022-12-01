import { NForm, NFormItem, NInputNumber } from "naive-ui"
import { defineComponent } from "vue"
import { object } from "vue-types"

interface FormData {
    time: number
}

export default defineComponent({
    props: {
        data: object<FormData>().isRequired
    },
    setup(props) {
        return () => (
            <NForm>
                <NFormItem label="等待时间" path="time">
                    <NInputNumber v-model:value={props.data.time}
                        placeholder="请输入"
                        min="0"
                        step="100"
                        v-slots={{
                            suffix: () => 'ms'
                        }} />
                </NFormItem>
            </NForm>
        )
    }
})