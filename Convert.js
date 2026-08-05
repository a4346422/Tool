/**
 * Sub-Store Sing-box v1.14.x Converter
 *
 * Template:
 * https://github.com/a4346422/Tool
 *
 * Features:
 * - No region groups
 * - Inject all nodes
 * - Auto urltest
 * - All selectors contain all nodes
 */


// ==========================
// Config
// ==========================

const TEMPLATE_URL =
  "https://raw.githubusercontent.com/a4346422/Tool/X/sing-box/v1.14.x/Client/sing-box.json";


const SELECTOR_GROUPS = [
  "Manual",
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


// ==========================
// Load template
// ==========================

let config = await fetch(TEMPLATE_URL)
  .then(res => res.json());


// ==========================
// Get nodes
// ==========================

let nodes = $substore.nodes || [];

if (!nodes.length) {
  throw new Error("没有获取到订阅节点");
}


// ==========================
// Normalize node tag
// ==========================

let nodeTags = nodes.map((node, index) => {

  if (node.tag) {
    return node.tag;
  }

  if (node.name) {
    return node.name;
  }

  return `node-${index + 1}`;

});


// ==========================
// Ensure outbound array
// ==========================

if (!Array.isArray(config.outbounds)) {
  config.outbounds = [];
}


// ==========================
// Remove old injected nodes
// ==========================

let reservedTags = config.outbounds
  .map(item => item.tag)
  .filter(Boolean);


config.outbounds =
  config.outbounds.filter(item => {

    return (
      reservedTags.includes(item.tag)
    );

  });


// ==========================
// Add real proxy nodes
// ==========================

config.outbounds.push(...nodes);


// ==========================
// Update Auto
// ==========================

let auto = config.outbounds.find(
  item => item.tag === "Auto"
);


if (auto) {

  auto.outbounds = [
    ...nodeTags
  ];

}


// ==========================
// Update selector groups
// ==========================

for (let item of config.outbounds) {


  if (
    item.type === "selector" &&
    SELECTOR_GROUPS.includes(item.tag)
  ) {


    let old = item.outbounds || [];


    // 保留已有策略组
    let base = old.filter(
      x => !nodeTags.includes(x)
    );


    item.outbounds = [
      ...base,
      ...nodeTags
    ];

  }

}


// ==========================
// Return sing-box config
// ==========================

return config;
