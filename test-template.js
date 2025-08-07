// 测试 template 处理逻辑
const fs = require('fs');

// 模拟中文处理函数
const includeChinese = (text) => {
  return /[\u4e00-\u9fa5]/.test(text);
};

const generateKey = (prefix, text) => {
  return `${prefix}.${text.replace(/[^\w\u4e00-\u9fa5]/g, '_')}`;
};

const quoteKeys = 'this.$t';

// 使用完整的Vue文件测试用例
const testVueContent = `<template> 
  <div class="app-container">
    <el-card class="operate-container" shadow="never">
      <i class="el-icon-tickets"></i>
      <span>发货列表</span>
    </el-card>
    <div class="table-container">
      <el-table ref="deliverOrderTable"
                style="width: 100%;"
                :data="list" border>
        <el-table-column label="订单编号" width="180" align="center">
          <template slot-scope="scope">{{scope.row.orderSn}}</template>
        </el-table-column>
        <el-table-column label="收货人" width="180" align="center">
          <template slot-scope="scope">{{scope.row.receiverName}}</template>
        </el-table-column>
        <el-table-column label="手机号码" width="160" align="center">
          <template slot-scope="scope">{{scope.row.receiverPhone}}</template>
        </el-table-column>
        <el-table-column label="邮政编码" width="160" align="center">
          <template slot-scope="scope">{{scope.row.receiverPostCode}}</template>
        </el-table-column>
        <el-table-column label="收货地址" align="center">
          <template slot-scope="scope">{{scope.row.address}}</template>
        </el-table-column>
        <el-table-column label="配送方式" width="160" align="center">
          <template slot-scope="scope">
            <el-select placeholder="请选择物流公司"
                       v-model="scope.row.deliveryCompany"
                       size="small">
              <el-option v-for="item in companyOptions"
                         :key="item"
                         :label="item"
                         :value="item">
              </el-option>
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="物流单号" width="180" align="center">
          <template slot-scope="scope">
            <el-input size="small" v-model="scope.row.deliverySn"></el-input>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 15px;text-align: center">
        <el-button @click="cancel">取消</el-button>
        <el-button @click="confirm" type="primary">确定</el-button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BasePagination',
  props: {
    // 当数据为空时隐藏，根据total判断
    hideOnEmpty: {
      type: Boolean,
      default: true,
    },
    currentPage: {
      type: Number,
      default: 1,
    },
    pageSize: {
      type: Number,
      default: 10,
    },
    total: {
      type: Number,
    },
    pageSizes: {
      type: Array,
      default() {
        return [10, 20, 50]
      },
    },
    layout: {
      type: String,
      default: '->, total, sizes, prev, pager, next, jumper, slot',
    },
  },
  methods: {
    handleSizeChange() {
      this.$emit('update:current-page', 1)
      this.$emit('change')
    },
    handleCurrentChange(val) {
      console.log(val)
      this.$emit('change')
      this.$emit('update:current-page', val)
    },
  },
}
</script>`;

console.log('=== 原始内容 ===');
console.log(testVueContent);

// 测试新的 findTemplateBlock 方法
console.log('\n=== 测试新的 findTemplateBlock 方法 ===');

const findTemplateBlock = (source) => {
  const templateStart = source.indexOf('<template');
  if (templateStart === -1) {return null;}
  
  let depth = 0;
  let pos = templateStart;
  
  // 找到开始的 template 标签
  const startTagMatch = source.slice(pos).match(/<template(?:\s+[^>]*)?>/);
  if (!startTagMatch) {return null;}
  
  const startTag = startTagMatch[0];
  pos += startTag.length;
  depth = 1;
  
  // 查找匹配的结束标签
  while (pos < source.length && depth > 0) {
    const nextOpen = source.indexOf('<template', pos);
    const nextClose = source.indexOf('</template>', pos);
    
    if (nextClose === -1) {break;} // 没有找到结束标签
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      // 找到了嵌套的 template 开始标签
      depth++;
      pos = nextOpen + 1;
    } else {
      // 找到了结束标签
      depth--;
      if (depth === 0) {
        // 找到了匹配的结束标签
        const endPos = nextClose + '</template>'.length;
        return {
          fullBlock: source.slice(templateStart, endPos),
          content: source.slice(templateStart + startTag.length, nextClose),
          startTag: startTag
        };
      }
      pos = nextClose + 1;
    }
  }
  
  return null;
};

// 模拟完整的处理流程
console.log('\n=== 模拟完整的处理流程 ===');

let newSFC = '';
let i18nMap = {};
const keyPrefix = 'BasePagination';

// 1. 处理 template 块
const templateBlock = findTemplateBlock(testVueContent);
if (templateBlock) {
  console.log('找到 template 块');
  
  let processedTemplateContent = templateBlock.content;
  
  // 处理中文内容
  // 1. 先处理属性中的中文 label="中文"
  processedTemplateContent = processedTemplateContent.replace(/([\s])([a-zA-Z0-9_-]+)="([^"]*[\u4e00-\u9fa5]+[^"]*)"/g, (match, space, attr, chinese) => {
    if (chinese.includes('$t(')) {
      return match;
    }
    const key = generateKey(keyPrefix, chinese);
    i18nMap[key] = chinese;
    return `${space}:${attr}="${quoteKeys}('${key}')"`;
  });
  
  // 2. 处理 {{ ... }} 中的中文
  processedTemplateContent = processedTemplateContent.replace(/{{([^}]*)}}/g, (match, expr) => {
    if (includeChinese(expr)) {
      return expr.replace(/[\u4e00-\u9fa5]+/g, (chinese) => {
        const key = generateKey(keyPrefix, chinese);
        i18nMap[key] = chinese;
        return `${quoteKeys}('${key}')`;
      });
    }
    return match;
  });
  
  // 3. 最后处理纯文本中的中文
  processedTemplateContent = processedTemplateContent.replace(/[\u4e00-\u9fa5]+/g, (chinese) => {
    const beforeMatch = processedTemplateContent.substring(0, processedTemplateContent.indexOf(chinese));
    const inExpression = beforeMatch.lastIndexOf('{{') > beforeMatch.lastIndexOf('}}');
    const inAttribute = /:\w+="[^"]*$/.test(beforeMatch);
    
    if (inExpression || inAttribute) {
      return chinese;
    }
    
    const key = generateKey(keyPrefix, chinese);
    i18nMap[key] = chinese;
    return `{{ ${quoteKeys}('${key}') }}`;
  });
  
  // 重新组装 template 块
  const newTemplateBlock = templateBlock.startTag + processedTemplateContent + '</template>';
  newSFC += newTemplateBlock;
  
  console.log('Template 块处理完成');
}

// 2. 处理其他块
const blockRegex = /<(script(?:\s+setup)?|style)([^>]*)>([\s\S]*?)<\/\1>/g;
blockRegex.lastIndex = 0;

while ((match = blockRegex.exec(testVueContent)) !== null) {
  const tag = match[1];
  const fullBlock = match[0];
  
  if (tag === 'template') {
    console.log('跳过 template 块（已处理）');
    continue;
  }
  
  console.log(`处理 ${tag} 块`);
  newSFC += fullBlock;
}

console.log('\n=== 最终结果 ===');
console.log(newSFC);

// 检查完整性
console.log('\n=== 完整性检查 ===');
console.log('原始内容包含 </el-table>:', testVueContent.includes('</el-table>'));
console.log('原始内容包含 </div>:', testVueContent.includes('</div>'));
console.log('原始内容包含 </template>:', testVueContent.includes('</template>'));
console.log('原始内容包含 </script>:', testVueContent.includes('</script>'));
console.log('结果内容包含 </el-table>:', newSFC.includes('</el-table>'));
console.log('结果内容包含 </div>:', newSFC.includes('</div>'));
console.log('结果内容包含 </template>:', newSFC.includes('</template>'));
console.log('结果内容包含 </script>:', newSFC.includes('</script>'));

console.log('\n=== 中文映射 ===');
console.log(i18nMap); 