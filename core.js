// ===== Виртуальный узел =====
export function jsx(type, props, ...children) {
  return { type, props: props || {}, children };
}

// ===== Реестр компонентов =====
const componentRegistry = {};
export function registerComponent(name, fn) {
  componentRegistry[name] = fn;
}

// ===== Состояние и рендер =====
let states = [];
let stateIndex = 0;
let AppRoot = null;
let container = null;

export function render(Component, target) {
  AppRoot = Component;
  container = typeof target === "string" ? document.querySelector(target) : target;
  if (!container) throw new Error('Core: контейнер не найден. Проверь render(App, "#app") и наличие <div id="app">');
  rerender();
}

function rerender() {
  stateIndex = 0;
  const newVNode = AppRoot();
  const oldNode = container.firstChild;
  diff(container, newVNode, oldNode);
}

function isText(v) {
  return typeof v === "string" || typeof v === "number";
}

// ===== DIFF =====
function diff(parent, newVNode, oldNode) {
  // Добавление
  if (!oldNode) {
    parent.appendChild(createElement(newVNode));
    return;
  }
  // Удаление
  if (!newVNode) {
    parent.removeChild(oldNode);
    return;
  }
  // Текст
  if (isText(newVNode)) {
    if (oldNode.nodeType === 3) {
      const t = String(newVNode);
      if (oldNode.textContent !== t) oldNode.textContent = t;
    } else {
      parent.replaceChild(document.createTextNode(String(newVNode)), oldNode);
    }
    return;
  }
  // Массив (фрагмент/список)
  if (Array.isArray(newVNode)) {
    const frag = document.createDocumentFragment();
    newVNode.forEach(child => frag.appendChild(createElement(child)));
    parent.replaceChild(frag, oldNode);
    return;
  }
  // Компонент
  if (typeof newVNode.type === "function") {
    const compVNode = newVNode.type({ ...(newVNode.props || {}), children: newVNode.children });
    diff(parent, compVNode, oldNode);
    return;
  }
  // Разный тип узла → заменить
  if (oldNode.nodeName.toLowerCase() !== newVNode.type) {
    parent.replaceChild(createElement(newVNode), oldNode);
    return;
  }

  // Обновить пропсы
  updateProps(oldNode, newVNode.props);

  // Обновить детей
  const oldChildren = Array.from(oldNode.childNodes);
  const newChildren = newVNode.children || [];
  const max = Math.max(oldChildren.length, newChildren.length);
  for (let i = 0; i < max; i++) {
    diff(oldNode, newChildren[i], oldChildren[i]);
  }
}

// ===== Создание узла =====
function createElement(vnode) {
  if (vnode == null || vnode === false) return document.createTextNode("");
  if (isText(vnode)) return document.createTextNode(String(vnode));

  if (Array.isArray(vnode)) {
    const frag = document.createDocumentFragment();
    vnode.forEach(child => frag.appendChild(createElement(child)));
    return frag;
  }

  if (typeof vnode.type === "function") {
    const compVNode = vnode.type({ ...(vnode.props || {}), children: vnode.children });
    return createElement(compVNode);
  }

  const el = document.createElement(vnode.type);
  updateProps(el, vnode.props);
  (vnode.children || []).forEach(child => el.appendChild(createElement(child)));
  return el;
}

function updateProps(el, props = {}) {
  // снять атрибуты, которых больше нет
  [...el.attributes].forEach(attr => {
    if (!(attr.name in props)) el.removeAttribute(attr.name);
  });
  
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    
    // Стили объектом
    if (key === "style" && typeof value === "object") {
      Object.assign(el.style, value);
      continue;
    }
    
    // События onClick/onInput/...
    if (key.startsWith("on") && typeof value === "function") {
      const evt = key.slice(2).toLowerCase();
      if (el[`__handler_${evt}`]) el.removeEventListener(evt, el[`__handler_${evt}`]);
      el.addEventListener(evt, value);
      el[`__handler_${evt}`] = value;
      continue;
    }
    
    // Значение для input/textarea
    if (key === "value" && "value" in el) {
      el.value = value;
      continue;
    }
    
    // Ссылки <a>: атрибуты + явная навигация
    if (el.tagName.toLowerCase() === "a") {
      if (key === "href" || key === "target" || key === "rel") {
        el.setAttribute(key, value);
        if (!el.__core_link_bound) {
          el.addEventListener("click", (e) => {
            if (e.defaultPrevented) return;
            const href = el.getAttribute("href");
            if (!href) return;
            const tgt = el.getAttribute("target");
            if (tgt === "_blank") {
              const win = window.open(href, "_blank", "noopener,noreferrer");
              if (win) { try { win.opener = null; } catch {} }
            } else {
              window.location.assign(href);
            }
            e.preventDefault();
          });
          el.__core_link_bound = true;
        }
        continue;
      }
    }
    
    // Картинки <img>
    if (el.tagName.toLowerCase() === "img" && (key === "src" || key === "alt")) {
      el.setAttribute(key, value);
      continue;
    }
    
    // iframe
    if (el.tagName.toLowerCase() === "iframe" && key === "src") {
      el.setAttribute(key, value);
      continue;
    }
    
    // Прямое свойство DOM-узла
    if (key in el && typeof value !== "object") {
      el[key] = value;
    } else {
      el.setAttribute(key, value);
    }
  }
}

// ===== Хуки =====
export function useState(initialValue) {
  const idx = stateIndex++;
  if (states[idx] === undefined) states[idx] = initialValue;
  function setValue(next) {
    states[idx] = typeof next === "function" ? next(states[idx]) : next;
    rerender();
  }
  return [states[idx], setValue];
}

// ===== tpl: шаблонные строки → VNode =====
// Атрибутные выражения: onClick=${fn} → onClick="__EXPR_i__"
// Детские выражения: ${child} → <!--EXPR_i-->
export function tpl(strings, ...values) {
  let html = "";

  for (let i = 0; i < strings.length; i++) {
    // Фрагменты <>...</> → <fragment>...</fragment>
    let chunk = strings[i]
      .replace(/<>\s*/g, "<fragment>")
      .replace(/\s*<\/>\s*/g, "</fragment>");

    html += chunk;

    if (i < values.length) {
      const prev = chunk.trimEnd();
      // Если предыдущий кусок заканчивается на "=" → это атрибутное значение
      const endsWithEq = /(?:^|[\s"'])\w+\s*=$/.test(prev);
      if (endsWithEq) {
        html += `"__EXPR_${i}__"`; // атрибутная вставка
      } else {
        html += `<!--EXPR_${i}-->`; // детская вставка
      }
    }
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const root = doc.body.firstChild;
  return domToVNode(root, values);
}

function domToVNode(node, values) {
  if (!node) return null;

  // Комментарий: детская вставка
  if (node.nodeType === 8) {
    const data = node.data || "";
    if (data.startsWith("EXPR_")) {
      const idx = parseInt(data.slice(5), 10);
      return normalizeExpr(values[idx]);
    }
    return null;
  }

  // Текст
  if (node.nodeType === 3) return node.textContent;

  // Фрагмент: вернуть детей как массив
  if (node.tagName === "FRAGMENT") {
    const children = [];
    node.childNodes.forEach(child => {
      const v = domToVNode(child, values);
      if (Array.isArray(v)) children.push(...v);
      else if (v !== null && v !== false && v !== "") children.push(v);
    });
    return children;
  }

  // Тег/компонент
  const tagName = node.tagName;
  const isComponent = /^[A-Z]/.test(tagName);
  const type = isComponent ? componentRegistry[tagName] : tagName.toLowerCase();

  const props = {};
  const children = [];

  // Атрибуты: выражения и спред
  [...node.attributes].forEach(attr => {
    const name = attr.name;
    const raw = attr.value;

    // Спред-пропсы: ...i → взять values[i] как объект
    if (name.startsWith("...")) {
      const idx = parseInt(name.slice(3), 10);
      Object.assign(props, normalizeExpr(values[idx]) || {});
      return;
    }

    // Атрибут-выражение: "__EXPR_i__"
    const m = /^__EXPR_(\d+)__$/.exec(raw);
    if (m) {
      const idx = parseInt(m[1], 10);
      props[name] = normalizeExpr(values[idx]);
    } else {
      props[name] = raw;
    }
  });

  // Дети
  node.childNodes.forEach(child => {
    const v = domToVNode(child, values);
    if (Array.isArray(v)) children.push(...v);
    else if (v !== null && v !== false && v !== "") children.push(v);
  });

  return jsx(type, props, ...children);
}

function normalizeExpr(val) {
  if (val === false || val === null || val === undefined) return null;
  if (Array.isArray(val)) return val.map(normalizeExpr).filter(v => v !== null);
  return val;
}


