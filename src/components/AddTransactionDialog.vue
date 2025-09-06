<template>
  <el-dialog
    v-model="dialogVisible"
    title="添加交易记录"
    width="500px"
    :before-close="handleClose"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="交易类型" prop="type">
        <el-radio-group v-model="form.type">
          <el-radio label="income">收入</el-radio>
          <el-radio label="expense">支出</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <el-form-item label="金额" prop="amount">
        <el-input
          v-model.number="form.amount"
          type="number"
          placeholder="请输入金额"
          :min="0"
          step="0.01"
        >
          <template #prepend>¥</template>
        </el-input>
      </el-form-item>
      
      <el-form-item label="分类" prop="category">
        <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
          <el-option-group
            v-for="group in categoryOptions"
            :key="group.label"
            :label="group.label"
          >
            <el-option
              v-for="item in group.options"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-option-group>
        </el-select>
      </el-form-item>
      
      <el-form-item label="日期" prop="date">
        <el-date-picker
          v-model="form.date"
          type="date"
          placeholder="选择日期"
          style="width: 100%"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
      
      <el-form-item label="备注" prop="note">
        <el-input
          v-model="form.note"
          type="textarea"
          placeholder="请输入备注信息（可选）"
          :rows="3"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          {{ loading ? '保存中...' : '保存' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useDataStore } from '@/stores/data'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const dataStore = useDataStore()
const formRef = ref()
const loading = ref(false)

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 表单数据
const form = reactive({
  type: 'expense',
  amount: null,
  category: '',
  date: dayjs().format('YYYY-MM-DD'),
  note: ''
})

// 分类选项
const categoryOptions = computed(() => {
  const incomeCategories = [
    { value: 'salary', label: '工资' },
    { value: 'bonus', label: '奖金' },
    { value: 'investment', label: '投资收益' },
    { value: 'freelance', label: '自由职业' },
    { value: 'rental', label: '租金收入' },
    { value: 'other', label: '其他收入' }
  ]
  
  const expenseCategories = [
    { value: 'food', label: '餐饮' },
    { value: 'transport', label: '交通' },
    { value: 'entertainment', label: '娱乐' },
    { value: 'shopping', label: '购物' },
    { value: 'utilities', label: '水电费' },
    { value: 'healthcare', label: '医疗' },
    { value: 'education', label: '教育' },
    { value: 'other', label: '其他支出' }
  ]
  
  return form.type === 'income' 
    ? [{ label: '收入分类', options: incomeCategories }]
    : [{ label: '支出分类', options: expenseCategories }]
})

// 表单验证规则
const rules = {
  type: [
    { required: true, message: '请选择交易类型', trigger: 'change' }
  ],
  amount: [
    { required: true, message: '请输入金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ],
  date: [
    { required: true, message: '请选择日期', trigger: 'change' }
  ]
}

// 监听交易类型变化，重置分类
watch(() => form.type, () => {
  form.category = ''
})

// 重置表单
const resetForm = () => {
  form.type = 'expense'
  form.amount = null
  form.category = ''
  form.date = dayjs().format('YYYY-MM-DD')
  form.note = ''
  
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 处理提交
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    // 添加交易记录
    const transaction = {
      type: form.type,
      amount: form.amount,
      category: form.category,
      date: form.date,
      note: form.note || ''
    }
    
    dataStore.addTransaction(transaction)
    
    ElMessage.success('交易记录添加成功')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('添加交易记录失败:', error)
    ElMessage.error('添加失败，请重试')
  } finally {
    loading.value = false
  }
}

// 处理关闭
const handleClose = () => {
  resetForm()
  dialogVisible.value = false
}
</script>

<style lang="scss" scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-radio-group) {
  .el-radio {
    margin-right: 24px;
  }
}

:deep(.el-input-group__prepend) {
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-weight: 500;
}
</style>