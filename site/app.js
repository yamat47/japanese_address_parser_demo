// ruby.wasm のバージョン。ページの中で動く Ruby のバージョンもここで決まる。
// TODO: ruby.wasm と Leaflet のバージョンは Dependabot の対象外なので、手で更新する必要がある。
const RUBY_WASM_VERSION = "2.10.1";
const RUBY_VM_URL = `https://cdn.jsdelivr.net/npm/@ruby/wasm-wasi@${RUBY_WASM_VERSION}/dist/browser/+esm`;
const RUBY_WASM_URL = `https://cdn.jsdelivr.net/npm/@ruby/4.0-wasm-wasi@${RUBY_WASM_VERSION}/dist/ruby+stdlib.wasm`;

const LEAFLET_URL = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4";
const LEAFLET_ASSETS = {
  css: {
    href: `${LEAFLET_URL}/leaflet.min.css`,
    integrity: "sha512-h9FcoyWjHcOcmEVkxOfTLnmZFWIH0iZhZT1H2TbOq55xssQGEJHEaIm+PgoUaZbRvQTNTluNOEfb1ZRy6D3BOw==",
  },
  js: {
    src: `${LEAFLET_URL}/leaflet.min.js`,
    integrity: "sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g==",
  },
};

const SAMPLES = [
  { name: "東京スカイツリー", address: "東京都墨田区押上1丁目1-2" },
  { name: "札幌市時計台", address: "北海道札幌市中央区北1条西2丁目" },
  { name: "中尊寺", address: "岩手県西磐井郡平泉町平泉衣関202" },
  { name: "兼六園", address: "石川県金沢市兼六町1" },
  { name: "清水寺", address: "京都府京都市東山区清水1丁目294" },
  { name: "大阪城", address: "大阪府大阪市中央区大阪城1-1" },
  { name: "原爆ドーム", address: "広島県広島市中区大手町1丁目10" },
  { name: "道後温泉本館", address: "愛媛県松山市道後湯之町5-6" },
  { name: "首里城", address: "沖縄県那覇市首里金城町1丁目2" },
];

// 住所を構成するパーツ。key と attributes は Ruby でのアクセサと同じ名前・同じ順にしている。
// level はそのパーツまで判別できたときの Address#level、zoom はその level の座標を表示するときの地図のズーム。
const PARTS = [
  {
    key: "prefecture",
    label: "都道府県",
    attributes: ["name", "code", "name_kana", "name_romaji"],
    level: 1,
    zoom: 8,
  },
  {
    key: "city",
    label: "市区町村",
    attributes: ["name", "code", "county", "ward", "name_kana", "name_romaji"],
    level: 2,
    zoom: 12,
  },
  {
    key: "town",
    label: "町字",
    attributes: ["name", "machiaza_id", "chome", "chome_n", "koaza"],
    level: 3,
    zoom: 15,
  },
  { key: "addr", label: "番地・号", level: 8, zoom: 16 },
  { key: "other", label: "その他" },
];
const LEVELS = PARTS.filter((part) => part.level);
const POINT = { key: "point", label: "緯度経度", attributes: ["lat", "lng", "level"] };

const form = document.getElementById("form");
const input = document.getElementById("input");
const submit = document.getElementById("submit");
const samples = document.getElementById("samples");
const status = document.getElementById("status");
const result = document.getElementById("result");

let demo;
let leaflet;
let map;
let marker;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setBusy(busy) {
  input.disabled = busy;
  submit.disabled = busy;
  for (const button of samples.querySelectorAll("button")) button.disabled = busy;
}

function setStatus(text, isError = false) {
  status.textContent = text;
  status.classList.toggle("is-error", isError);
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.text();
}

async function boot() {
  const [{ DefaultRubyVM }, module, demoScript] = await Promise.all([
    import(RUBY_VM_URL),
    WebAssembly.compileStreaming(fetch(RUBY_WASM_URL)),
    fetchText("demo.rb"),
  ]);

  const { vm } = await DefaultRubyVM(module);
  // demo.rb の中で例外が起きると evalAsync が完了しないことがあるため、Ruby 側で捕まえて nil を返させる。
  const booted = await vm.evalAsync(
    `begin\n${demoScript}\nrescue Exception => e\n  JS.global[:console].error(e.full_message(highlight: false))\n  nil\nend`,
  );
  if (!booted.toString()) throw new Error("demo.rb を評価できませんでした");
  const versions = JSON.parse(booted.toString());
  demo = { vm, module: vm.eval("Demo") };

  document.getElementById("versions").textContent =
    `japanese_address_parser ${versions.gem} / Ruby ${versions.ruby} (ruby.wasm)`;
}

async function parse(address) {
  const json = await demo.module.callAsync("parse", demo.vm.wrap(address));
  return JSON.parse(json.toString());
}

// 地図は Ruby の起動より後にしか使わないので、最初に必要になったときに読み込む。
function loadLeaflet() {
  leaflet ??= new Promise((resolve, reject) => {
    const css = Object.assign(element("link"), { rel: "stylesheet", crossOrigin: "anonymous", ...LEAFLET_ASSETS.css });
    const js = Object.assign(element("script"), { crossOrigin: "anonymous", ...LEAFLET_ASSETS.js });
    js.addEventListener("load", () => resolve(window.L));
    js.addEventListener("error", () => {
      // 次に地図が必要になったときに読み込みをやり直せるようにする。
      leaflet = undefined;
      reject(new Error("Leaflet を読み込めませんでした"));
    });
    document.head.append(css, js);
  });
  return leaflet;
}

// 都道府県・市区町村・町字は VO の name、番地・号とその他は文字列そのものを表示する。
function partText(address, { key, attributes }) {
  return attributes ? address[key]?.name : address[key];
}

function renderParts(address) {
  const items = PARTS.filter((part) => partText(address, part)).map((part) => {
    const item = element("li", `part part-${part.key}`);
    item.append(element("span", "part-text", partText(address, part)), element("span", "part-label", part.label));
    return item;
  });
  document.getElementById("parts").replaceChildren(...items);
}

function renderLevel(address) {
  const steps = LEVELS.map(({ key, level }) =>
    element("span", `level-step ${address.level >= level ? `is-on part-${key}` : ""}`),
  );
  document.getElementById("level-steps").replaceChildren(...steps);

  const matched = LEVELS.findLast(({ level }) => address.level >= level);
  document.getElementById("level-code").textContent = `level ${address.level}`;
  document.getElementById("level-text").textContent = matched
    ? `${matched.label}まで判別できました`
    : "住所として判別できませんでした";
}

function attributeRow(path, value) {
  const isNil = value === null || value === undefined;
  const row = element("div", "attribute");
  // 文字列は Ruby の inspect のように引用符つきで表示する。
  row.append(element("dt", "", path), element("dd", isNil ? "is-nil" : "", isNil ? "nil" : JSON.stringify(value)));
  return row;
}

function renderAttributes(address) {
  const groups = [...PARTS, POINT].map(({ key, label, attributes }) => {
    const group = element("section", `group part-${key}`);
    const list = element("dl", "attribute-list");
    const value = address[key];
    if (attributes && value) {
      list.append(...attributes.map((attribute) => attributeRow(`${key}.${attribute}`, value[attribute])));
    } else {
      list.append(attributeRow(key, value));
    }
    group.append(element("h2", "group-label", label), list);
    return group;
  });

  document.getElementById("attributes").replaceChildren(...groups);
}

async function renderMap(point) {
  const container = document.getElementById("map");
  container.hidden = !point;
  document.getElementById("map-empty").hidden = Boolean(point);
  if (!point) return;

  const L = await loadLeaflet();
  const position = [point.lat, point.lng];
  if (!map) {
    map = L.map(container, { scrollWheelZoom: false });
    L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>',
    }).addTo(map);
    marker = L.marker(position, {
      icon: L.divIcon({ className: "pin", iconSize: [28, 28], iconAnchor: [14, 28] }),
      keyboard: false,
    }).addTo(map);
  }

  map.invalidateSize();
  marker.setLatLng(position);
  map.setView(position, LEVELS.find(({ level }) => level === point.level)?.zoom ?? 15);
}

function render(address) {
  result.hidden = false;
  renderParts(address);
  renderLevel(address);
  renderAttributes(address);
  // 地図を読み込めなくても、解析結果そのものは表示したままにする。
  renderMap(address.point).catch((error) => console.error(error));
}

async function run(address) {
  const text = address.trim();
  if (!text) return;

  input.value = text;
  setBusy(true);
  setStatus("解析しています…");
  try {
    const started = performance.now();
    const parsed = await parse(text);
    if (parsed.error) {
      setStatus("住所データを取得できませんでした。時間をおいてもう一度お試しください。", true);
    } else {
      render(parsed);
      setStatus(`${Math.round(performance.now() - started)} ミリ秒で解析しました`);
    }
  } catch (error) {
    console.error(error);
    setStatus("解析中にエラーが発生しました。", true);
  } finally {
    setBusy(false);
  }
}

samples.append(
  ...SAMPLES.map((sample) => {
    const item = element("li");
    const button = element("button", "sample", sample.name);
    button.type = "button";
    button.title = sample.address;
    button.disabled = true;
    button.addEventListener("click", () => run(sample.address));
    item.append(button);
    return item;
  }),
);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  run(input.value);
});

input.value = SAMPLES[0].address;

try {
  await boot();
  await run(SAMPLES[0].address);
} catch (error) {
  console.error(error);
  setStatus("Ruby を読み込めませんでした。ページを再読み込みしてください。", true);
}
