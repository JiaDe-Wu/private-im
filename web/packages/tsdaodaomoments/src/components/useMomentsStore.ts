import { useEffect, useReducer } from "react";
import { MomentsStore } from "../service";

/** 订阅朋友圈状态，状态变化时重新渲染 */
export function useMomentsStore(): MomentsStore {
    const [, force] = useReducer((n: number) => n + 1, 0)
    useEffect(() => MomentsStore.shared.subscribe(force), [])
    return MomentsStore.shared
}
