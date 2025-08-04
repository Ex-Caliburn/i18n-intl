# 火山翻译API测试用例

这个测试用例用于验证火山翻译API是否能正常调用和翻译。

## 文件说明

- `test-simple.js` - 简化的测试文件，包含完整的签名算法和API调用
- `test-advanced.js` - 高级测试文件，包含详细的调试信息和错误处理

## 使用步骤

### 1. 环境检查

首先运行环境检查脚本：

```bash
node check-env.js
```

### 2. 安装依赖

如果环境检查显示缺少依赖，请运行：

```bash
npm install node-fetch
```

### 3. 获取火山翻译API密钥

1. 登录 [火山引擎控制台](https://console.volcengine.com/)
2. 创建翻译服务实例
3. 获取 AccessKey 和 SecretKey

### 4. 修改测试文件

打开 `test-simple.js` 文件，替换以下内容：

```javascript
const accessKey = 'YOUR_ACCESS_KEY';  // 替换为你的 AccessKey
const secretKey = 'YOUR_SECRET_KEY';  // 替换为你的 SecretKey
```

### 5. 运行测试

```bash
# 简单测试
node test-simple.js

# 高级测试（包含详细调试信息）
node test-advanced.js
```

## 预期输出

如果配置正确，你应该看到类似以下的输出：

```
测试翻译: "你好世界"
请求URL: https://translate.volcengineapi.com/?Action=TranslateText&Version=2020-06-01
请求头: {
  "X-Date": "20231201T120000Z",
  "Content-Type": "application/json",
  "Authorization": "HMAC-SHA256 Credential=... Signature=..."
}
请求体: {
  "TextList": ["你好世界"],
  "SourceLanguage": "zh",
  "TargetLanguage": "en"
}
响应状态: 200
响应数据: {
  "ResponseMetadata": {
    "RequestId": "...",
    "Action": "TranslateText",
    "Version": "2020-06-01",
    "Service": "translate",
    "Region": "cn-north-1"
  },
  "TranslationList": [
    {
      "Translation": "Hello world"
    }
  ]
}
翻译结果: "Hello world"
✅ 翻译成功！
```

## 常见问题

### 1. 签名错误

如果遇到签名错误，请检查：
- AccessKey 和 SecretKey 是否正确
- 时间是否同步（建议使用NTP服务器）
- 请求参数是否正确

### 2. 网络错误

如果遇到网络错误，请检查：
- 网络连接是否正常
- 防火墙设置是否允许HTTPS请求
- 代理设置是否正确

### 3. API限制

火山翻译API可能有以下限制：
- 请求频率限制
- 单次请求文本长度限制
- 账户余额限制

## 签名算法说明

测试用例使用了与官方示例完全一致的签名算法：

1. **HMAC-SHA256** 签名
2. **AWS4** 签名格式
3. **规范化请求** 处理
4. **查询参数** 排序和编码

## 扩展测试

你可以修改 `test-simple.js` 中的 `testText` 变量来测试不同的中文文本：

```javascript
const testText = '你想要翻译的中文文本';
```

或者使用 `test-translate.js` 来批量测试多个文本。 