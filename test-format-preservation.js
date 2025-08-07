const fs = require('fs-extra');
const path = require('path');

// 模拟Vue文件内容（包含不同的格式情况）
const testVueContent1 = `<template>
  <el-select
    v-bind="[$props, $attrs]"
    placeholder="Please select"
    :class="['country-select', { 'country-multiple': multiple }]"
    @change="changeCountry"
  >
    <el-option
      v-for="item in countryOptions"
      :key="item.standardCountry"
      :label="item.country"
      :value="item.standardCountry"
    >
    </el-option>
  </el-select>
</template>

<script>
// https://element.eleme.cn/#/zh-CN/component/cascader 优化
import { getMenuCountry } from "@/api/country";

export default {
  name: "CountrySelect",
  props: {
    value: {
      type: [String, Array],
    },
    menu: {
      type: String,
    },
    multiple: {
      type: Boolean,
    },
  },
  data() {
    return {
      MENU_MAP: {
        home: "Home",
        industry: "Global_Industry_Data",
        competitor: "Global_Competitor_Data",
        awareness: "Global_Awareness_Data",
        googleTrend: "Google_Trend",
      },
      countryOptions: "",
    };
  },
  created() {
    // console.log('created 2')
    getMenuCountry({
      menu: this.MENU_MAP[this.menu],
    })
      .then((response) => {
        console.log(this.value);
        if (!response.data || !response.data.countrys) return;
        let countryOptions = response.data.countrys;
        let country;
        let validCountry;
        let validCountryList = []; // 判断两个数组是否相同，不同，重新请求
        if (this.multiple) {
          for (let i = 0; i < countryOptions.length; i++) {
            if (this.value.includes(countryOptions[i].standardCountry)) {
              validCountryList.push(countryOptions[i].standardCountry);
            }
          }
          if (validCountryList.length !== this.value.length) {
            // validCountryList 为空或者有值
            if (validCountryList.length) {
              this.$store.commit("SET_USER_COUNTRY", validCountryList[0]);
            }
          }
          country = Array.from(new Set(validCountryList));
        } else {
          validCountry = countryOptions.find(
            (item) => item.standardCountry === this.selectCountry
          );
          // console.log(validCountry, this.selectCountry)
          // 先判定有没有，没有的过滤掉
          if (!validCountry) {
            country = countryOptions[0].standardCountry;
          } else {
            country = this.selectCountry;
          }
          this.$store.commit("SET_USER_COUNTRY", country);
        }
        this.$emit("input", country);
        this.$emit("change", country);
        this.countryOptions = countryOptions;
      })
      .catch((err) => {
        console.log(err);
      });
  },
  methods: {
    changeCountry(val) {
      console.log(val, this.multiple);
      // let country
      if (!this.multiple) {
        this.$store.commit("SET_USER_COUNTRY", val);
        // country = val[0]
      } else {
        // country = val
      }
      this.$emit("input", val);
      this.$emit("change", val);
    },
  },
};
</script>

<style lang='scss' scoped>
@import "@/styles/element-variables.scss";

.country-select >>> {
  .el-select__caret {
    color: #fff;
  }
  .el-input__inner {
    color: #fff;
  }
}
.country-select:not(.country-multiple) >>> {
  .el-input__inner {
    background-color: $--color-primary;
  }
}
.country-select.country-multiple >>> {
  .el-tag {
    background-color: $--color-primary;
    border-color: $--color-primary;
    color: #fff;
    .el-tag__close {
      background-color: $--color-primary !important;
      color: #fff;
    }
  }
}
</style>`;

// 模拟没有换行的Vue文件内容
const testVueContent2 = `<template>
  <el-select
    v-bind="[$props, $attrs]"
    placeholder="Please select"
    :class="['country-select', { 'country-multiple': multiple }]"
    @change="changeCountry"
  >
    <el-option
      v-for="item in countryOptions"
      :key="item.standardCountry"
      :label="item.country"
      :value="item.standardCountry"
    >
    </el-option>
  </el-select>
</template><script>
// https://element.eleme.cn/#/zh-CN/component/cascader 优化
import { getMenuCountry } from "@/api/country";

export default {
  name: "CountrySelect",
  props: {
    value: {
      type: [String, Array],
    },
    menu: {
      type: String,
    },
    multiple: {
      type: Boolean,
    },
  },
  data() {
    return {
      MENU_MAP: {
        home: "Home",
        industry: "Global_Industry_Data",
        competitor: "Global_Competitor_Data",
        awareness: "Global_Awareness_Data",
        googleTrend: "Google_Trend",
      },
      countryOptions: "",
    };
  },
  created() {
    // console.log('created 2')
    getMenuCountry({
      menu: this.MENU_MAP[this.menu],
    })
      .then((response) => {
        console.log(this.value);
        if (!response.data || !response.data.countrys) return;
        let countryOptions = response.data.countrys;
        let country;
        let validCountry;
        let validCountryList = []; // 判断两个数组是否相同，不同，重新请求
        if (this.multiple) {
          for (let i = 0; i < countryOptions.length; i++) {
            if (this.value.includes(countryOptions[i].standardCountry)) {
              validCountryList.push(countryOptions[i].standardCountry);
            }
          }
          if (validCountryList.length !== this.value.length) {
            // validCountryList 为空或者有值
            if (validCountryList.length) {
              this.$store.commit("SET_USER_COUNTRY", validCountryList[0]);
            }
          }
          country = Array.from(new Set(validCountryList));
        } else {
          validCountry = countryOptions.find(
            (item) => item.standardCountry === this.selectCountry
          );
          // console.log(validCountry, this.selectCountry)
          // 先判定有没有，没有的过滤掉
          if (!validCountry) {
            country = countryOptions[0].standardCountry;
          } else {
            country = this.selectCountry;
          }
          this.$store.commit("SET_USER_COUNTRY", country);
        }
        this.$emit("input", country);
        this.$emit("change", country);
        this.countryOptions = countryOptions;
      })
      .catch((err) => {
        console.log(err);
      });
  },
  methods: {
    changeCountry(val) {
      console.log(val, this.multiple);
      // let country
      if (!this.multiple) {
        this.$store.commit("SET_USER_COUNTRY", val);
        // country = val[0]
      } else {
        // country = val
      }
      this.$emit("input", val);
      this.$emit("change", val);
    },
  },
};
</script>

<style lang='scss' scoped>
@import "@/styles/element-variables.scss";

.country-select >>> {
  .el-select__caret {
    color: #fff;
  }
  .el-input__inner {
    color: #fff;
  }
}
.country-select:not(.country-multiple) >>> {
  .el-input__inner {
    background-color: $--color-primary;
  }
}
.country-select.country-multiple >>> {
  .el-tag {
    background-color: $--color-primary;
    border-color: $--color-primary;
    color: #fff;
    .el-tag__close {
      background-color: $--color-primary !important;
      color: #fff;
    }
  }
}
</style>`;

// 模拟修复后的Vue文件处理过程
function simulateFormatPreservation(sourceCode, description) {
  console.log(`\n=== ${description} ===`);
  
  let newSFC = '';
  let processedTemplate = false;
  
  // 1. 处理 template 块
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
      
      if (nextClose === -1) {break;}
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 1;
      } else {
        depth--;
        if (depth === 0) {
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
  
  const templateBlock = findTemplateBlock(sourceCode);
  if (templateBlock) {
    const { fullBlock, content, startTag } = templateBlock;
    console.log('✅ 找到template块');
    console.log('template内容长度:', content.length);
    
    // 模拟处理template内容（这里只是简单替换）
    let processedTemplateContent = content;
    
    // 重新组装 template 块
    const newTemplateBlock = startTag + processedTemplateContent + '</template>';
    newSFC += newTemplateBlock;
    processedTemplate = true;
    
    console.log('✅ template块处理完成');
  }
  
  // 2. 处理其他块
  const blockRegex = /<(script(?:\s+setup)?|style)([^>]*)>([\s\S]*?)<\/\1>/g;
  let match;
  const processedBlocks = new Set();
  
  // 重新设置正则表达式的lastIndex
  blockRegex.lastIndex = 0;
  
  console.log('\n=== 处理其他块 ===');
  
  while ((match = blockRegex.exec(sourceCode)) !== null) {
    const tag = match[1];
    const fullBlock = match[0];
    
    // 跳过 template（已处理）
    if (tag === 'template') {
      console.log('跳过template块（已处理）');
      continue;
    }
    
    // 避免重复处理
    if (processedBlocks.has(fullBlock)) {
      console.log('跳过重复块');
      continue;
    }
    processedBlocks.add(fullBlock);
    
    console.log(`\n处理 ${tag} 块:`);
    console.log('块内容长度:', match[3].length);
    
    if (tag === 'script' || tag === 'script setup') {
      const scriptContent = match[3];
      const scriptTagMatch = match[0].match(/^<script[^>]*>/);
      if (!scriptTagMatch) {
        console.log('❌ 无法解析script标签');
        continue;
      }
      const scriptTag = scriptTagMatch[0];
      
      // 模拟处理script内容
      let newScriptContent = scriptContent;
      
      const newScriptBlock = scriptTag + newScriptContent + '</script>';
      newSFC += newScriptBlock;
      console.log('✅ script块处理完成');
    } else {
      // 其他块（style、自定义块等）保持原样
      newSFC += fullBlock;
      console.log('✅ 其他块保持原样');
    }
  }
  
  // 3. 保持原有格式
  console.log('\n=== 保持原有格式 ===');
  if (processedTemplate && newSFC.includes('</template>') && newSFC.includes('<script')) {
    const templateEndIndex = newSFC.indexOf('</template>');
    const scriptStartIndex = newSFC.indexOf('<script');
    
    if (templateEndIndex !== -1 && scriptStartIndex !== -1 && scriptStartIndex > templateEndIndex) {
      const beforeScript = newSFC.substring(0, templateEndIndex + '</template>'.length);
      const afterScript = newSFC.substring(scriptStartIndex);
      const betweenContent = newSFC.substring(templateEndIndex + '</template>'.length, scriptStartIndex);
      
      // 检查原始文件中template和script之间的格式
      const originalTemplateEndIndex = sourceCode.indexOf('</template>');
      const originalScriptStartIndex = sourceCode.indexOf('<script');
      
      console.log('template结束位置:', templateEndIndex);
      console.log('script开始位置:', scriptStartIndex);
      console.log('当前中间内容:', JSON.stringify(betweenContent));
      console.log('当前中间内容长度:', betweenContent.length);
      
      if (originalTemplateEndIndex !== -1 && originalScriptStartIndex !== -1 && originalScriptStartIndex > originalTemplateEndIndex) {
        const originalBetweenContent = sourceCode.substring(originalTemplateEndIndex + '</template>'.length, originalScriptStartIndex);
        
        console.log('原始中间内容:', JSON.stringify(originalBetweenContent));
        console.log('原始中间内容长度:', originalBetweenContent.length);
        
        // 使用原始格式，确保保持原有的换行
        if (originalBetweenContent.trim() === '' && !betweenContent.includes('\n')) {
          // 如果原始格式是空的，添加两个换行符（Vue标准格式）
          console.log('❌ 发现格式问题，正在修复...');
          newSFC = beforeScript + '\n\n' + afterScript;
          console.log('✅ 修复完成，添加了标准换行符');
        } else if (originalBetweenContent.includes('\n')) {
          // 如果原始格式有换行，保持原有格式
          console.log('✅ 保持原始格式');
          newSFC = beforeScript + originalBetweenContent + afterScript;
        }
      }
    }
  }
  
  console.log('\n=== 最终结果 ===');
  console.log('原始内容长度:', sourceCode.length);
  console.log('处理后内容长度:', newSFC.length);
  
  // 检查修复后的结果
  const templateEndIndex = newSFC.indexOf('</template>');
  const scriptStartIndex = newSFC.indexOf('<script>');
  
  if (templateEndIndex !== -1 && scriptStartIndex !== -1) {
    const betweenContent = newSFC.substring(templateEndIndex + '</template>'.length, scriptStartIndex);
    console.log('\n=== 检查最终结果 ===');
    console.log('template结束位置:', templateEndIndex);
    console.log('script开始位置:', scriptStartIndex);
    console.log('最终中间内容:', JSON.stringify(betweenContent));
    console.log('最终中间内容长度:', betweenContent.length);
    
    if (betweenContent.includes('\n')) {
      console.log('✅ 格式正确：相邻标签之间有换行符');
    } else {
      console.log('❌ 格式错误：相邻标签之间没有换行符');
    }
  }
  
  // 显示最终结果的关键部分
  console.log('\n=== 最终结果预览 ===');
  const templateEnd = newSFC.indexOf('</template>');
  const scriptStart = newSFC.indexOf('<script>');
  
  if (templateEnd !== -1 && scriptStart !== -1) {
    console.log('template结束部分:');
    console.log(newSFC.substring(templateEnd - 20, templateEnd + '</template>'.length));
    console.log('\n中间部分:');
    console.log(newSFC.substring(templateEnd + '</template>'.length, scriptStart));
    console.log('\nscript开始部分:');
    console.log(newSFC.substring(scriptStart, scriptStart + 50));
  }
}

// 运行测试
simulateFormatPreservation(testVueContent1, '测试1：标准格式（有换行）');
simulateFormatPreservation(testVueContent2, '测试2：问题格式（没有换行）'); 