<template>
  <div class="container">
    <BaseTable 
      :data="tableData"
      :columns="columns"
      :loading="loading"
      :label="$t('test-vue-files.complex.数据列表')"
    >
      <template #header>
        <div class="header">
          <h2> $t('test-vue-files.complex.$t('test-vue-files.complex.{{ $t('test-vue-files.complex.用户管理') }}')') </h2>
          <p> $t('test-vue-files.complex.$t('test-vue-files.complex.{{ $t('test-vue-files.complex.管理所有用户信息') }}')') </p>
        </div>
      </template><script setup lang="ts">
import { ref, computed } from 'vuethis.$t('test-vue-files.complex.interfaceUser姓名string年龄number状态stringconstloadingreffalseconsttableDatarefUser姓名')张三this.$t('test-vue-files.complex.年龄25状态')activethis.$t('test-vue-files.complex.姓名')李四this.$t('test-vue-files.complex.年龄30状态')inactive' }
])

const columns = computed(() => [
  { prop: this.$t(this.$t('test-vue-files.complex.testvuefilescomplex姓名')), label: this.$t(this.$t('test-vue-files.complex.testvuefilescomplex姓名')) },
  { prop: this.$t(this.$t('test-vue-files.complex.testvuefilescomplex年龄')), label: this.$t(this.$t('test-vue-files.complex.testvuefilescomplex年龄')) },
  { prop: this.$t(this.$t('test-vue-files.complex.testvuefilescomplex状态')), label: this.$t(this.$t('test-vue-files.complex.testvuefilescomplex状态')) }
])

const handleUserAction = (action: string) => {
  console.log(this.$t(this.$t('test-vue-files.complex.testvuefilescomplex执行操作')), action)
  alert(this.$t(this.$t('test-vue-files.complex.testvuefilescomplex操作已执行')))
}
</script><style scoped>
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
</style>