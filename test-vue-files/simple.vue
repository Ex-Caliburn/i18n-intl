<template>
  <div>
    <h1>{{ $t('test-vue-files.simple.欢迎使用') }}</h1>
    <p>{{ $t('test-vue-files.simple.这是一个测试页面') }}</p>
    <button :label="按钮文本">{{ $t('test-vue-files.simple.点击我') }}</button>
  </div>
</template><script>
export default {
  data() {
    return {
      按钮文本: this.$t('test-vue-files.simple.提交'),
      消息: this.$t('test-vue-files.simple.操作成功')
    }
  },
  methods: {
    handleClick() {
      console.log(this.$t('test-vue-files.simple.用户点击了按钮'));
      alert(this.$t('test-vue-files.simple.处理完成'));
    }
  }
}
</script><style>
.title {
  color: #333;
}
</style>