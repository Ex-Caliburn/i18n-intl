# Vue项目i18n配置自动创建功能

## 功能说明

当在Vue项目中使用"项目设置"命令时，插件会自动检测项目类型。如果检测到是Vue项目，并且`src/locales/index.js`文件不存在，插件会自动创建以下文件：

### 创建的文件

1. **`src/locales/index.js`** - Vue i18n配置文件
2. **`src/locales/zh_cn.json`** - 中文翻译文件

### 检测逻辑

插件通过检查`package.json`中的依赖来判断是否为Vue项目：

- 检查`dependencies`或`devDependencies`中是否包含`vue`依赖

### 配置文件内容

#### src/locales/index.js

```javascript
import VueI18n from 'vue-i18n'
import Vue from 'vue'
let zh = require('./zh_cn.json')

Vue.use(VueI18n)

export default new VueI18n({
 locale: 'zh',
 messages: {
  zh 
 }
})
```

#### src/locales/zh_cn.json

```json
{}
```

## 使用方法

1. 在VSCode中打开Vue项目
2. 右键点击项目根目录
3. 选择 "i18n" -> "项目设置"
4. 插件会自动检测项目类型并创建相应的配置文件

## 注意事项

- 如果`src/locales/index.js`文件不存在，插件会自动创建
- 如果`src/locales/index.js`文件存在但为空，插件会自动添加内容
- 如果`src/locales/index.js`文件存在且不为空，插件会提示是否覆盖
- 如果`src/locales/zh_cn.json`文件已存在，插件会跳过创建
- 插件会自动创建`src/locales`目录（如果不存在）

## 兼容性

- 支持Vue 2.x项目
- 支持Vue 3.x项目（需要手动调整配置）
- 支持Vue CLI项目
- 支持Vite项目
