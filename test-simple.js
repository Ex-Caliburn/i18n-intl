const crypto = require("crypto");
const qs = require("querystring");
const fetch = require("node-fetch");

// 火山引擎签名相关函数
function hmac(secret, s) {
  return crypto.createHmac('sha256', secret).update(s, 'utf8').digest();
}

function hash(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function getDateTimeNow() {
  const now = new Date();
  return now.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function getBodySha(body) {
  const hash = crypto.createHash('sha256');
  if (typeof body === 'string') {
    hash.update(body);
  }
  return hash.digest('hex');
}

function uriEscape(str) {
  try {
    return encodeURIComponent(str)
      .replace(/[^A-Za-z0-9_.~\-%]+/g, escape)
      .replace(/[*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
  } catch (e) {
    return '';
  }
}

function queryParamsToString(params) {
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

function getSignHeaders(originHeaders, needSignHeaders) {
  function trimHeaderValue(header) {
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

function sign(params) {
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

  return [
    "HMAC-SHA256",
    `Credential=${accessKeyId}/${credentialScope},`,
    `SignedHeaders=${signedHeaders},`,
    `Signature=${signature}`,
  ].join(' ');
}

// 调用火山翻译API
async function translateText(text, accessKey, secretKey) {
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
      signParams.query[key] = '';
    }
  }

  const authorization = sign(signParams);
  
  const headers = {
    ...signParams.headers,
    'Authorization': authorization
  };

  const url = `https://translate.volcengineapi.com/?${qs.stringify(signParams.query)}`;

  try {
    console.log('请求URL:', url);
    console.log('请求头:', JSON.stringify(headers, null, 2));
    console.log('请求体:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: bodyString
    });

    console.log('响应状态:', response.status);
    
    const data = await response.json();
    console.log('响应数据:', JSON.stringify(data, null, 2));
    
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

// 测试用例
async function testTranslate() {
  // 火山翻译API密钥
  const accessKey = '';
  const secretKey = '';

  const testText = '你好世界';
  console.log(`测试翻译: "${testText}"`);
  
  try {
    const translation = await translateText(testText, accessKey, secretKey);
    console.log(`翻译结果: "${translation}"`);
    console.log('✅ 翻译成功！');
  } catch (error) {
    console.log(`❌ 翻译失败: ${error.message}`);
  }
}

// 运行测试
testTranslate().catch(console.error); 