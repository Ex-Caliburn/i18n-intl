const fs = require('fs-extra');
const path = require('path');

// 简化的测试数据
const testVueFiles = [
  {
    name: 'simple.vue',
    content: `<template>
  <div>
    <h1>欢迎使用</h1>
    <p>这是一个测试页面</p>
    <button :label="按钮文本">点击我</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      按钮文本: '提交',
      消息: '操作成功'
    }
  },
  methods: {
    handleClick() {
      console.log('用户点击了按钮');
      alert('处理完成');
    }
  }
}
</script>

<style>
.title {
  color: #333;
}
</style>`
  },
  {
    name: 'complex.vue',
    content: `<template>
  <div class="container">
    <BaseTable 
      :data="tableData"
      :columns="columns"
      :loading="loading"
      label="数据列表"
    >
      <template #header>
        <div class="header">
          <h2>用户管理</h2>
          <p>管理所有用户信息</p>
        </div>
      </template>
      
      <template #default="{ row }">
        <div class="row-content">
          <span>{{ row.姓名 }}</span>
          <span>{{ row.年龄 }}岁</span>
          <span>{{ row.状态 === 'active' ? '活跃' : '非活跃' }}</span>
        </div>
      </template>
    </BaseTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface User {
  姓名: string
  年龄: number
  状态: string
}

const loading = ref(false)
const tableData = ref<User[]>([
  { 姓名: '张三', 年龄: 25, 状态: 'active' },
  { 姓名: '李四', 年龄: 30, 状态: 'inactive' }
])

const columns = computed(() => [
  { prop: '姓名', label: '姓名' },
  { prop: '年龄', label: '年龄' },
  { prop: '状态', label: '状态' }
])

const handleUserAction = (action: string) => {
  console.log('执行操作:', action)
  alert('操作已执行')
}
</script>

<style scoped>
.container {
  padding: 20px;
}

.header h2 {
  color: #333;
}

.row-content {
  display: flex;
  gap: 10px;
}
</style>`
  }
];

// 创建测试目录
const testDir = path.join(__dirname, 'test-vue-files');
fs.ensureDirSync(testDir);

// 清空并重新创建测试文件
fs.emptyDirSync(testDir);

// 创建测试文件
testVueFiles.forEach(file => {
  const filePath = path.join(testDir, file.name);
  fs.writeFileSync(filePath, file.content, 'utf8');
  console.log(`创建测试文件: ${file.name}`);
});

console.log('\n测试文件已重新创建在:', testDir);
console.log('现在可以运行优化后的转换工具来测试这些文件'); 