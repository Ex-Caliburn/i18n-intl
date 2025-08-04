import * as vscode from "vscode";
import * as fs from "fs-extra";
import * as path from "path";
import * as util from "util";
import * as qs from "querystring";
import { getI18nConfig, getRootPath, unFlattenJson } from "../utils";

const debuglog = util.debuglog('signer');

// 火山翻译API接口
interface HuoshanTranslateResponse {
  ResponseMetadata: {
    RequestId: string;
    Action: string;
    Version: string;
    Service: string;
    Region: string;
    Error?: {
      Code: string;
      Message: string;
    };
  };
  TranslationList: Array<{
    Translation: string;
  }>;
}

// 递归翻译对象中的所有中文值
async function translateObject(obj: any, accessKey: string, secretKey: string): Promise<any> {
  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // 检查是否包含中文
      if (/[\u4e00-\u9fa5]/.test(value)) {
        try {
          const translatedText = await translateText(value, accessKey, secretKey);
          result[key] = translatedText;
        } catch (error) {
          console.error(`翻译失败: ${value}`, error);
          result[key] = value; // 翻译失败时保持原值
        }
      } else {
        result[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // 递归处理嵌套对象
      result[key] = await translateObject(value, accessKey, secretKey);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// 火山引擎签名相关函数
function hmac(secret: string | Buffer, s: string): Buffer {
  return require('crypto').createHmac('sha256', secret).update(s, 'utf8').digest();
}



function hash(s: string): string {
  return require('crypto').createHash('sha256').update(s, 'utf8').digest('hex');
}

function getDateTimeNow(): string {
  const now = new Date();
  return now.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function getBodySha(body: string): string {
  const hash = require('crypto').createHash('sha256');
  if (typeof body === 'string') {
    hash.update(body);
  }
  return hash.digest('hex');
}

function queryParamsToString(params: any): string {
  return Object.keys(params)
    .sort()
    .map((key) => {
      const val = params[key];
      if (typeof val === 'undefined' || val === null) {
        return `${uriEscape(key)}=`;
      }
      const escapedKey = uriEscape(key);
      if (!escapedKey) {
        return undefined;
      }
      if (Array.isArray(val)) {
        return `${escapedKey}=${val.map(uriEscape).sort().join(`&${escapedKey}=`)}`;
      }
      return `${escapedKey}=${uriEscape(val)}`;
    })
    .filter((v) => v)
    .join('&');
}

function uriEscape(str: string): string {
  try {
    return encodeURIComponent(str)
      .replace(/[^A-Za-z0-9_.~\-%]+/g, escape)
      .replace(/[*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
  } catch (e) {
    return '';
  }
}

function sign(params: any): string {
  const {
    headers = {},
    query = {},
    region = '',
    serviceName = '',
    method = '',
    pathName = '/',
    accessKeyId = '',
    secretAccessKey = '',
    needSignHeaderKeys = [],
    bodySha,
  } = params;
  
  const datetime = headers["X-Date"];
  const date = datetime.substring(0, 8); // YYYYMMDD
  
  // 创建正规化请求
  const [signedHeaders, canonicalHeaders] = getSignHeaders(headers, needSignHeaderKeys);
  
  const canonicalRequest = [
    method.toUpperCase(),
    pathName,
    queryParamsToString(query) || '',
    `${canonicalHeaders}\n`,
    signedHeaders,
    bodySha || hash(''),
  ].join('\n');
  
  const credentialScope = [date, region, serviceName, "request"].join('/');
  
  // 创建签名字符串
  const stringToSign = ["HMAC-SHA256", datetime, credentialScope, hash(canonicalRequest)].join('\n');
  
  // 计算签名
  const kDate = hmac(secretAccessKey, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "request");
  const signature = hmac(kSigning, stringToSign).toString('hex');
  debuglog('--------CanonicalString:\n%s\n--------SignString:\n%s', canonicalRequest, stringToSign);

  return [
    "HMAC-SHA256",
    `Credential=${accessKeyId}/${credentialScope},`,
    `SignedHeaders=${signedHeaders},`,
    `Signature=${signature}`,
  ].join(' ');
}

function getSignHeaders(originHeaders: any, needSignHeaders?: string[]) {
  function trimHeaderValue(header: any) {
    return header.toString?.().trim().replace(/\s+/g, ' ') ?? '';
  }

  const HEADER_KEYS_TO_IGNORE = new Set([
    "authorization",
    "content-type", 
    "content-length",
    "user-agent",
    "presigned-expires",
    "expect",
  ]);

  let h = Object.keys(originHeaders);
  // 根据 needSignHeaders 过滤
  if (Array.isArray(needSignHeaders)) {
    const needSignSet = new Set([...needSignHeaders, 'x-date', 'host'].map((k) => k.toLowerCase()));
    h = h.filter((k) => needSignSet.has(k.toLowerCase()));
  }
  // 根据 ignore headers 过滤
  h = h.filter((k) => !HEADER_KEYS_TO_IGNORE.has(k.toLowerCase()));
  const signedHeaderKeys = h
    .slice()
    .map((k) => k.toLowerCase())
    .sort()
    .join(';');
  const canonicalHeaders = h
    .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
    .map((k) => `${k.toLowerCase()}:${trimHeaderValue(originHeaders[k])}`)
    .join('\n');
  return [signedHeaderKeys, canonicalHeaders];
}

// 调用火山翻译API
async function translateText(text: string, accessKey: string, secretKey: string): Promise<string> {
  const requestBody = {
    TextList: [text],
    SourceLanguage: 'zh',
    TargetLanguage: 'en'
  };

  const bodyString = JSON.stringify(requestBody);
  
  // 使用官方demo的签名方法
  const signParams = {
    headers: {
      'X-Date': getDateTimeNow(),
      'Content-Type': 'application/json'
    },
    method: 'POST',
    query: {
      Action: 'TranslateText',
      Version: '2020-06-01'
    },
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    serviceName: 'translate',
    region: 'cn-north-1',
    bodySha: getBodySha(bodyString)
  };

  // 正规化 query object，防止串化后出现 query 值为 undefined 情况
  for (const [key, val] of Object.entries(signParams.query)) {
    if (val === undefined || val === null) {
      (signParams.query as any)[key] = '';
    }
  }

  const authorization = sign(signParams);
  
  const headers = {
    ...signParams.headers,
    'Authorization': authorization
  };

  const url = `https://translate.volcengineapi.com/?${qs.stringify(signParams.query)}`;

  try {
    console.log('火山翻译API请求URL:', url);
    console.log('火山翻译API请求头:', headers);
    console.log('火山翻译API请求体:', requestBody);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: bodyString
    });

    console.log('火山翻译API响应状态:', response.status);
    console.log('火山翻译API响应头:', response.headers);
    
    const data = await response.json() as HuoshanTranslateResponse;
    console.log('火山翻译API响应:', data);
    
    if (data.ResponseMetadata?.Error) {
      throw new Error(`翻译API错误: ${data.ResponseMetadata.Error.Message}`);
    }
    
    const translation = data.TranslationList?.[0]?.Translation;
    if (!translation) {
      throw new Error('翻译API错误: 未获取到翻译结果');
    }
    
    return translation;
  } catch (error) {
    console.error('火山翻译API调用失败:', error);
    throw error;
  }
}

export default (context: vscode.ExtensionContext) => {
  vscode.commands.registerCommand("i18n.translateToEnglish", async () => {
    try {
      // 读取配置文件
      const config = getI18nConfig();
      const { hsAccessKey, hsSecretKey, outDir, defaultLanguage, extname, outShow } = config as any;

      if (!hsAccessKey || !hsSecretKey) {
        vscode.window.showErrorMessage("请在配置文件中设置火山翻译的AccessKey和SecretKey");
        return;
      }

      console.log('火山翻译配置检查:', {
        hsAccessKey: hsAccessKey ? '已设置' : '未设置',
        hsSecretKey: hsSecretKey ? '已设置' : '未设置',
        outDir,
        defaultLanguage,
        extname,
        outShow
      });

      // 获取项目根路径
      const rootPath = getRootPath();
      if (!rootPath) {
        vscode.window.showErrorMessage("无法获取项目根路径");
        return;
      }

      // 构建源语言文件路径
      const sourceFileName = `${defaultLanguage}.${extname}`;
      const sourceFilePath = path.resolve(rootPath, outDir, sourceFileName);

      // 检查源语言文件是否存在
      if (!fs.existsSync(sourceFilePath)) {
        vscode.window.showErrorMessage(`源语言文件不存在: ${sourceFilePath}`);
        return;
      }

      // 读取源语言JSON文件
      const jsonContent = await fs.readFile(sourceFilePath, 'utf8');
      const jsonData = JSON.parse(jsonContent);

      // 显示进度
      const progressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: "火山翻译中...",
        cancellable: false
      };

      await vscode.window.withProgress(progressOptions, async (progress) => {
        progress.report({ message: "正在翻译中文内容..." });
        
        // 翻译JSON对象
        let translatedData = await translateObject(jsonData, hsAccessKey, hsSecretKey);
        
        // 根据outShow配置决定输出格式
        if (outShow === 2) {
          console.log('转换为嵌套格式');
          translatedData = unFlattenJson(translatedData);
        }
        
        // 生成英文文件名
        const englishFileName = `en.${extname}`;
        const englishFilePath = path.resolve(rootPath, outDir, englishFileName);
        
        // 保存翻译后的文件
        await fs.writeFile(englishFilePath, JSON.stringify(translatedData, null, 2), 'utf8');
        
        progress.report({ message: "翻译完成！" });
      });

      vscode.window.showInformationMessage(`翻译完成`);

    } catch (error) {
      console.error('火山翻译过程中出错:', error);
      vscode.window.showErrorMessage(`火山翻译失败: ${error}`);
    }
  });
}; 