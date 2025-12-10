# CorexJS

// Corex.js — минималистичный стейт‑менеджер для Core
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

  // Оборачиваем middleware
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
      setSlice(newSlice);
    });
    return unsubscribe;
  }, [store]);

  return slice;
}

// Пример middleware
export const logger = ({ getState }) => (next) => (action) => {
  console.log("dispatching", action);
  const result = next(action);
  console.log("next state", getState());
  return result;
};

#Использование

import { createStore, combineReducers, StoreProvider, useStore, logger } from "./corex.js";

// редьюсеры
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

// объединяем
const rootReducer = combineReducers({
  counter: counterReducer,
  auth: authReducer
});

// создаём стор
const store = createStore(rootReducer, { counter: { count: 0 }, auth: { user: null } }, [logger]);

// компонент
function Counter() {
  const count = useStore(s => s.counter.count, store);
  const user = useStore(s => s.auth.user, store);

  if (!user) return <p>Войдите, чтобы пользоваться счётчиком</p>;

  return (
    <div>
      <p>Счётчик: {count}</p>
      <button onClick={() => store.dispatch({ type: "increment" })}>+</button>
      <button onClick={() => store.dispatch({ type: "decrement" })}>-</button>
    </div>
  );
}

function App() {
  return (
    <StoreProvider store={store}>
      <Counter />
    </StoreProvider>
  );
}
