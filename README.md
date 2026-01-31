`markdown

🌌 Corex.js

`
                             
  / |       |  \/  | _ 
 | |    /  \| '/  \ | |\/| |/ _ \
 | || () | | |  / | |  | |  /
  \|\/||  \| ||  ||\|
`

> Минималистичный стейт‑менеджер для Core  
> 🔷 Простота • 🔹 Гибкость • 🔵 Лёгкость

---

🔵 Возможности
- 🔹 createStore — создание стора  
- 🔹 getState — доступ к состоянию  
- 🔹 dispatch — поддержка async / thunk  
- 🔹 subscribe — подписка на изменения  
- 🔹 useStore — хук для компонентов  
- 🔹 StoreProvider — контекст для проброса стора  
- 🔹 middleware — расширяемая логика (цепочка)  
- 🔹 combineReducers — объединение редьюсеров

---

🔷 Установка
`bash
npm install corex.js
`

---

🔵 Файл corex.js (скопируй и положи в репозиторий)
`js
// corex.js — минималистичный стейт‑менеджер для Core
// Поддержка createStore, getState, dispatch (с async/thunk), subscribe,
// useStore, StoreProvider, middleware и combineReducers

import { createContext, useContext, useEffect, useState } from "core";

// Создание стора
export function createStore(reducer, initialState, middlewares = []) {
  let state = initialState;
  const listeners = new Set();

  const getState = () => state;

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  let dispatch = (action) => {
    if (typeof action === "function") {
      // async/thunk
      return action(dispatch, getState);
    }
    state = reducer(state, action);
    listeners.forEach((l) => l());
    return action;
  };

  // Оборачиваем middleware (как в Redux)
  middlewares.slice().reverse().forEach((mw) => {
    dispatch = mw({ getState, dispatch })(dispatch);
  });

  return { getState, dispatch, subscribe };
}

// combineReducers — объединение нескольких редьюсеров
export function combineReducers(reducers) {
  return function rootReducer(state = {}, action) {
    const nextState = {};
    let hasChanged = false;
    for (const key in reducers) {
      const reducer = reducers[key];
      const prevSlice = state[key];
      const nextSlice = reducer(prevSlice, action);
      nextState[key] = nextSlice;
      if (nextSlice !== prevSlice) {
        hasChanged = true;
      }
    }
    return hasChanged ? nextState : state;
  };
}

// Контекст для проброса стора
const StoreContext = createContext(null);

export function StoreProvider({ store, children }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

// Хук для подписки на состояние
export function useStore(selector, externalStore) {
  const store = externalStore || useContext(StoreContext);
  const [slice, setSlice] = useState(() => selector(store.getState()));

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const newSlice = selector(store.getState());
      // Предотвращаем лишние ререндеры
      if (!Object.is(slice, newSlice)) {
        setSlice(newSlice);
      }
    });
    return unsubscribe;
  }, [store, selector, slice]);

  return slice;
}

// Пример middleware
export const logger = ({ getState }) => (next) => (action) => {
  console.log("dispatching", action);
  const result = next(action);
  console.log("next state", getState());
  return result;
};
`

---

🔵 Пример использования (в одном файле для быстрого копирования)
`js
// app-example.js — пример использования Corex.js в одном файле

// --- импортируем локально сохранённый corex.js
import {
  createStore,
  combineReducers,
  StoreProvider,
  useStore,
  logger
} from "./corex.js";

// Редьюсеры
function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case "increment": return { count: state.count + 1 };
    case "decrement": return { count: state.count - 1 };
    default: return state;
  }
}

function authReducer(state = { user: null }, action) {
  switch (action.type) {
    case "login": return { user: action.payload };
    case "logout": return { user: null };
    default: return state;
  }
}

// Собираем root reducer и стор
const rootReducer = combineReducers({
  counter: counterReducer,
  auth: authReducer
});

const store = createStore(
  rootReducer,
  { counter: { count: 0 }, auth: { user: null } },
  [logger]
);

// Компонент счётчика
function Counter() {
  // Можно передать store явно или использовать StoreProvider
  const count = useStore(s => s.counter.count, store);
  const user = useStore(s => s.auth.user, store);

  if (!user) return <p>🔹 Войдите, чтобы пользоваться счётчиком</p>;

  return (
    <div>
      <p>🔵 Счётчик: {count}</p>
      <button onClick={() => store.dispatch({ type: "increment" })}>+</button>
      <button onClick={() => store.dispatch({ type: "decrement" })}>-</button>
    </div>
  );
}

// App
function App() {
  return (
    <StoreProvider store={store}>
      <Counter />
    </StoreProvider>
  );
}

// Пример асинхронного действия (thunk)
function fetchUserThunk(userId) {
  return async (dispatch, getState) => {
    dispatch({ type: "userfetchstart" });
    try {
      // пример: const res = await fetch(/api/users/${userId});
      // const data = await res.json();
      const data = { id: userId, name: "Demo User" }; // заглушка
      dispatch({ type: "login", payload: data });
    } catch (err) {
      dispatch({ type: "userfetcherror", payload: err });
    }
  };
}

// Использование thunk
store.dispatch(fetchUserThunk(1));
`

---

🔷 Рекомендации по улучшению
- 🔹 Оптимизация подписки: сравнивать слайсы через Object.is или shallowEqual чтобы избежать лишних ререндеров.  
- 🔹 Memoize селекторов: использовать reselect‑подобный подход для тяжёлых селекторов.  
- 🔹 DevTools: интеграция с Redux DevTools через middleware.  
- 🔹 Типизация: добавить TypeScript‑типы для Action, Reducer, Store.  
- 🔹 Batching: объединять последовательные диспатчи для уменьшения обновлений.

---

🔵 Лицензия
MIT © Corex.js

---

🔹 Вклад
PRs приветствуются: оптимизация селекторов, TypeScript‑типизация, интеграция DevTools. Пусть Corex остаётся лёгким и понятным, но мощным.
`