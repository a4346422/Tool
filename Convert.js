/**

* Sub-Store sing-box v1.14.x 自定义模板转换脚本
*
* 功能：
* 1. 读取当前文件中的 sing-box JSON 模板
* 2. 获取指定订阅并转换为 sing-box 节点
* 3. 将所有节点添加到顶层 outbounds
* 4. 将所有节点添加到 Auto、Manual 和所有业务策略组
*
* 参数：
* name=订阅名称
* type=0 或不填：普通订阅
* type=1 或 collection：组合订阅
*
* 示例：
* script.js#name=serv00
*
* 组合订阅：
* script.js#name=我的组合订阅&type=1
  */

log("开始执行");

let {
name,
type,
includeUnsupportedProxy,
url
} = $arguments;

// ==============================
// ① 解析当前模板
// ==============================

const parser = ProxyUtils.JSON5 || JSON;

let config;

try {
config = parser.parse($content ?? $files[0]);
} catch (error) {
throw new Error(
`模板不是合法的 JSON/JSON5：${error.message ?? error}`
);
}

if (!Array.isArray(config.outbounds)) {
config.outbounds = [];
}

// ==============================
// ② 获取订阅节点
// ==============================

type = /^1$|col|组合/i.test(type)
? "collection"
: "subscription";

let data;

if (url) {

log(`从 URL 获取订阅：${url}`);

data = await produceArtifact({
name,
type,
platform: "sing-box",

```
produceOpts: {
  "include-unsupported-proxy":
    includeUnsupportedProxy
},

subscription: {
  name,
  url,
  source: "remote"
}
```

});

} else {

if (!name) {
throw new Error(
"缺少订阅名称，请在脚本参数中设置 name"
);
}

log(
`读取${type === "collection" ? "组合" : ""}订阅：${name}`
);

data = await produceArtifact({
name,
type,
platform: "sing-box",

```
produceOpts: {
  "include-unsupported-proxy":
    includeUnsupportedProxy
}
```

});

}

data = JSON.parse(data);

// sing-box 转换结果
const proxyOutbounds =
Array.isArray(data.outbounds)
? data.outbounds
: [];

const endpoints =
Array.isArray(data.endpoints)
? data.endpoints
: [];

const proxies = [
...proxyOutbounds,
...endpoints
];

if (proxies.length === 0) {
throw new Error(
"没有获取到可用节点，请检查 name 是否与 Sub-Store 中的订阅名称完全一致"
);
}

log(
`获取节点：${proxyOutbounds.length} 个`
);

if (endpoints.length > 0) {
log(
`获取 endpoints：${endpoints.length} 个`
);
}

// ==============================
// ③ 获取所有节点标签
// ==============================

const nodeTags = proxies
.map(proxy => proxy.tag)
.filter(Boolean);

if (nodeTags.length === 0) {
throw new Error(
"节点没有有效的 tag"
);
}

// 去重
const uniqueNodeTags = [
...new Set(nodeTags)
];

log(
`有效节点标签：${uniqueNodeTags.length} 个`
);

// ==============================
// ④ 查找策略组
// ==============================

function findOutbound(tag) {

return config.outbounds.find(
outbound => outbound.tag === tag
);

}

// ==============================
// ⑤ 更新 Auto
// ==============================

const auto = findOutbound("Auto");

if (!auto) {

throw new Error(
'模板中没有找到 tag 为 "Auto" 的 outbound'
);

}

if (
auto.type !== "urltest"
) {

log(
`警告：Auto 当前类型是 ${auto.type}，不是 urltest`
);

}

// Auto 只放实际节点
auto.outbounds = [
...uniqueNodeTags
];

log(
`Auto 已添加 ${uniqueNodeTags.length} 个节点`
);

// ==============================
// ⑥ 更新 Manual
// ==============================

const manual = findOutbound("Manual");

if (!manual) {

throw new Error(
'模板中没有找到 tag 为 "Manual" 的 outbound'
);

}

// Manual：Auto + 所有节点 + Direct
manual.outbounds = [
"Auto",
...uniqueNodeTags,
"Direct"
];

log(
`Manual 已添加所有节点`
);

// ==============================
// ⑦ 更新业务策略组
// ==============================

const serviceGroups = [

"AI",

"Google",

"Microsoft",

"Social",

"Telegram",

"Game",

"Emby",

"Spotify",

"Streaming",

"Final"

];

for (
const groupTag of serviceGroups
) {

const group =
findOutbound(groupTag);

if (!group) {

```
log(
  `模板中没有找到 ${groupTag}，跳过`
);

continue;
```

}

/*

* 每个业务策略组：
*
* Manual
* Auto
* 所有实际节点
* Direct
  */

group.outbounds = [

```
"Manual",

"Auto",

...uniqueNodeTags,

"Direct"
```

];

log(
`${groupTag} 已添加所有节点`
);

}

// ==============================
// ⑧ 添加实际节点定义
// ==============================

/*

* 模板原本只有：
*
* Direct
* Manual
* AI
* Google
* ...
* Auto
*
* 这里把订阅转换出来的真实节点
* 追加到顶层 outbounds。
  */

const templateTags =
new Set(

```
config.outbounds
  .map(
    outbound => outbound.tag
  )
  .filter(Boolean)
```

);

const newProxies =

proxies.filter(

```
proxy =>

  proxy.tag &&

  !templateTags.has(
    proxy.tag
  )
```

);

config.outbounds.push(
...newProxies
);

log(
`已添加 ${newProxies.length} 个实际节点到顶层 outbounds`
);

// ==============================
// ⑨ 添加 endpoints
// ==============================

if (
endpoints.length > 0
) {

if (
!Array.isArray(
config.endpoints
)
) {

```
config.endpoints = [];
```

}

const endpointTags =

```
new Set(

  config.endpoints
    .map(
      endpoint =>
        endpoint.tag
    )
    .filter(Boolean)

);
```

const newEndpoints =

```
endpoints.filter(

  endpoint =>

    endpoint.tag &&

    !endpointTags.has(
      endpoint.tag
    )

);
```

config.endpoints.push(
...newEndpoints
);

}

// ==============================
// ⑩ 输出最终配置
// ==============================

$content = JSON.stringify(
config,
null,
2
);

log("转换完成");

function log(message) {

console.log(
`[自定义 sing-box 模板] ${message}`
);

}
