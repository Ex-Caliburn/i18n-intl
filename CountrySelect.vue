<template>
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
</style>