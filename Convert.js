/**

* Sub-Store sing-box v1.14.x 自定义模板脚本
*
* 固定模板：
* https://raw.githubusercontent.com/a4346422/Tool/refs/heads/X/sing-box/v1.14.x/Client/sing-box.json
*
* 功能：
* 1. 下载固定 sing-box 模板
* 2. 读取 Sub-Store 订阅
* 3. 转换为 sing-box 节点
* 4. 所有节点加入 Auto
* 5. 所有节点直接加入 Manual、AI、Google 等策略组
* 6. 不进行地区分类
*
* 参数：
*
* 使用 Sub-Store 已保存的订阅：
* #name=订阅名称
*
* 使用组合订阅：
* #type=组合订阅&name=组合订阅名称
*
* 直接使用订阅 URL：
* #url=订阅链接
*
* 可选：
* &includeUnsupportedProxy=true
  */

// =================================================
// ① 固定模板地址
// =================================================

const TEMPLATE_URL =
"https://raw.githubusercontent.com/a4346422/Tool/refs/heads/X/sing-box/v1.14.x/Client/sing-box.json";

// =================================================
// ② 获取脚本参数
// =================================================

let {
type,
name,
url,
includeUnsupportedProxy
} = $arguments;

type =
/^1$|col|组合/i.test(type)
? "collection"
: "subscription";

function log(message) {
console.log(
`[自定义 sing-box v1.14 模板] ${message}`
);
}

log("🚀 开始执行");

// =================================================
// ③ 下载固定模板
// =================================================

log(`① 下载模板：${TEMPLATE_URL}`);

let templateResponse;

try {

templateResponse =
await $http.get({
url: TEMPLATE_URL
});

} catch (error) {

throw new Error(
`下载模板失败：${error.message ?? error}`
);

}

const templateText =
templateResponse.body;

if (!templateText) {

throw new Error(
"模板下载成功，但模板内容为空"
);

}

const parser =
ProxyUtils.JSON5 || JSON;

let config;

try {

config =
parser.parse(templateText);

} catch (error) {

throw new Error(
`模板不是合法 JSON/JSON5：${error.message ?? error}`
);

}

if (
!Array.isArray(
config.outbounds
)
) {

config.outbounds = [];

}

log(
`模板加载成功，原始 outbounds：${config.outbounds.length}`
);

// =================================================
// ④ 获取订阅并转换为 sing-box
// =================================================

log("② 获取订阅节点");

let artifact;

if (url) {

log(
`从 URL 读取订阅`
);

artifact =
await produceArtifact({

```
  name:
    name || "Remote Subscription",

  type,

  platform:
    "sing-box",

  produceOpts: {

    "include-unsupported-proxy":
      includeUnsupportedProxy

  },

  subscription: {

    name:
      name || "Remote Subscription",

    url,

    source:
      "remote"

  }

});
```

} else {

if (!name) {

```
throw new Error(
  "缺少订阅参数。请设置 name，或者设置 url"
);
```

}

log(
`读取${type === "collection" ? "组合" : ""}订阅：${name}`
);

artifact =
await produceArtifact({

```
  name,

  type,

  platform:
    "sing-box",

  produceOpts: {

    "include-unsupported-proxy":
      includeUnsupportedProxy

  }

});
```

}

// =================================================
// ⑤ 解析转换后的节点
// =================================================

let subscriptionConfig;

try {

subscriptionConfig =
JSON.parse(artifact);

} catch (error) {

throw new Error(
`订阅转换结果不是合法 JSON：${error.message ?? error}`
);

}

const sourceOutbounds =
Array.isArray(
subscriptionConfig.outbounds
)
? subscriptionConfig.outbounds
: [];

const sourceEndpoints =
Array.isArray(
subscriptionConfig.endpoints
)
? subscriptionConfig.endpoints
: [];

const sourceProxies = [

...sourceOutbounds,

...sourceEndpoints

];

if (
sourceProxies.length === 0
) {

throw new Error(
"没有获取到可用节点"
);

}

const nodeTags = [

...new Set(

```
sourceProxies

  .map(
    node => node.tag
  )

  .filter(Boolean)
```

)

];

if (
nodeTags.length === 0
) {

throw new Error(
"订阅节点没有有效 tag"
);

}

log(
`获取 ${sourceOutbounds.length} 个节点`
);

if (
sourceEndpoints.length > 0
) {

log(
`获取 ${sourceEndpoints.length} 个 endpoint`
);

}

log(
`有效节点标签：${nodeTags.length}`
);

// =================================================
// ⑥ 查找模板策略组
// =================================================

function findOutbound(tag) {

return config.outbounds.find(

```
outbound =>

  outbound.tag === tag
```

);

}

// =================================================
// ⑦ 更新 Auto
// =================================================

const auto =
findOutbound("Auto");

if (!auto) {

throw new Error(
'模板中没有找到 "Auto" 策略组'
);

}

/*

* Auto：
*
* 节点1
* 节点2
* 节点3
  */

auto.outbounds = [

...nodeTags

];

log(
`Auto 已加入 ${nodeTags.length} 个节点`
);

// =================================================
// ⑧ 更新 Manual
// =================================================

const manual =
findOutbound("Manual");

if (!manual) {

throw new Error(
'模板中没有找到 "Manual" 策略组'
);

}

/*

* Manual：
*
* Auto
* 节点1
* 节点2
* 节点3
* Direct
  */

manual.outbounds = [

"Auto",

...nodeTags,

"Direct"

];

log(
"Manual 已加入 Auto、全部节点和 Direct"
);

// =================================================
// ⑨ 更新业务策略组
// =================================================

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
const groupTag
of serviceGroups
) {

const group =
findOutbound(
groupTag
);

if (!group) {

```
log(
  `未找到 ${groupTag}，跳过`
);

continue;
```

}

/*

* 每个业务策略组：
*
* Manual
* Auto
* 节点1
* 节点2
* 节点3
* Direct
  */

group.outbounds = [

```
"Manual",

"Auto",

...nodeTags,

"Direct"
```

];

log(
`${groupTag} 已加入全部节点`
);

}

// =================================================
// ⑩ 添加真实节点定义
// =================================================

/*

* selector/urltest 中只能引用节点 tag。
*
* 实际节点配置仍必须追加到
* 顶层 config.outbounds。
  */

const existingTags =

new Set(

```
config.outbounds

  .map(
    outbound =>
      outbound.tag
  )

  .filter(Boolean)
```

);

const newOutbounds =

sourceOutbounds.filter(

```
outbound =>

  outbound.tag &&

  !existingTags.has(
    outbound.tag
  )
```

);

config.outbounds.push(

...newOutbounds

);

log(
`顶层 outbounds 已添加 ${newOutbounds.length} 个真实节点`
);

// =================================================
// ⑪ 添加 endpoints
// =================================================

if (
sourceEndpoints.length > 0
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

const existingEndpointTags =

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
sourceEndpoints.filter(

  endpoint =>

    endpoint.tag &&

    !existingEndpointTags.has(
      endpoint.tag
    )

);
```

config.endpoints.push(

```
...newEndpoints
```

);

log(
`已添加 ${newEndpoints.length} 个 endpoint`
);

}

// =================================================
// ⑫ 输出最终配置
// =================================================

$content =
JSON.stringify(

```
config,

null,

2
```

);

log(
"✅ 转换完成"
);
