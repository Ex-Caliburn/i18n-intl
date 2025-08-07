# Vue文件格式修复功能

## 问题描述

在Vue文件处理过程中，相邻标签之间可能会连在一起，例如：
- `</template><script>`
- `</script><style>`

这会导致代码格式不规范，影响可读性。

## 解决方案

### 1. 格式保持逻辑

插件在处理Vue文件时，会检查所有相邻标签之间的格式，确保保持原有的换行和格式：

```typescript
// 保持原有格式：在所有相邻标签之间保持原有格式
const fixAdjacentTags = (newContent: string, originalContent: string) => {
  let fixedContent = newContent;
  
  // 检查所有可能的相邻标签组合
  const tagPairs = [
    { endTag: '</template>', startTag: '<script' },
    { endTag: '</script>', startTag: '<style' },
    { endTag: '</template>', startTag: '<style' },
    { endTag: '</script>', startTag: '<template' }
  ];
  
  for (const pair of tagPairs) {
    const endTagIndex = fixedContent.indexOf(pair.endTag);
    const startTagIndex = fixedContent.indexOf(pair.startTag);
    
    if (endTagIndex !== -1 && startTagIndex !== -1 && startTagIndex > endTagIndex) {
      const beforeStartTag = fixedContent.substring(0, endTagIndex + pair.endTag.length);
      const afterStartTag = fixedContent.substring(startTagIndex);
      const betweenContent = fixedContent.substring(endTagIndex + pair.endTag.length, startTagIndex);
      
      // 检查原始文件中对应标签之间的格式
      const originalEndTagIndex = originalContent.indexOf(pair.endTag);
      const originalStartTagIndex = originalContent.indexOf(pair.startTag);
      
      if (originalEndTagIndex !== -1 && originalStartTagIndex !== -1 && originalStartTagIndex > originalEndTagIndex) {
        const originalBetweenContent = originalContent.substring(originalEndTagIndex + pair.endTag.length, originalStartTagIndex);
        
        // 使用原始格式，确保保持原有的换行
        if (originalBetweenContent.trim() === '' && !betweenContent.includes('\n')) {
          // 如果原始格式是空的，添加两个换行符（Vue标准格式）
          fixedContent = beforeStartTag + '\n\n' + afterStartTag;
        } else if (originalBetweenContent.includes('\n')) {
          // 如果原始格式有换行，保持原有格式
          fixedContent = beforeStartTag + originalBetweenContent + afterStartTag;
        } else {
          // 如果原始格式没有换行但当前也没有，添加标准换行符
          fixedContent = beforeStartTag + '\n\n' + afterStartTag;
        }
      } else {
        // 如果找不到原始格式，添加标准换行符
        if (!betweenContent.includes('\n')) {
          fixedContent = beforeStartTag + '\n\n' + afterStartTag;
        }
      }
    }
  }
  
  return fixedContent;
};
```

### 2. 支持的标签组合

插件会检查以下相邻标签组合的格式：

1. **`</template>` 和 `<script>`** - template块和script块之间
2. **`</script>` 和 `<style>`** - script块和style块之间
3. **`</template>` 和 `<style>`** - template块和style块之间
4. **`</script>` 和 `<template>`** - script块和template块之间

### 3. 格式处理规则

- **保持原有格式**：如果原始文件中有换行，保持原有格式
- **添加标准格式**：如果原始格式为空且当前也没有换行，添加两个换行符（Vue标准格式）
- **智能修复**：如果找不到原始格式，自动添加标准换行符

## 功能特点

### ✅ 智能格式保持
- 检测原始文件中的格式
- 保持原有的换行和缩进
- 避免破坏现有的代码格式

### ✅ 标准格式修复
- 自动添加Vue标准格式的换行符
- 确保代码可读性和规范性
- 符合Vue单文件组件的最佳实践

### ✅ 全面覆盖
- 支持所有常见的相邻标签组合
- 处理各种格式情况
- 确保格式一致性

## 使用效果

### 修复前
```vue
</template><script>
// 代码内容
</script><style lang="scss" scoped>
// 样式内容
</style>
```

### 修复后
```vue
</template>

<script>
// 代码内容
</script>

<style lang="scss" scoped>
// 样式内容
</style>
```

## 注意事项

- 插件会自动检测和处理格式问题
- 不会影响Vue文件的功能和语法
- 保持代码的可读性和规范性
- 符合Vue单文件组件的最佳实践 