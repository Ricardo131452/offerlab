"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

/**
 * ECharts 薄封装：只负责"挂载 + resize + 销毁"。
 * 不引 echarts-for-react，避免多一层依赖和 SSR 兼容问题（本页是纯客户端）。
 */
export function Chart({ option, height = 260 }: { option: Record<string, unknown>; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const instance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    instance.current = chart;
    chart.setOption(option as echarts.EChartsOption);

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
      instance.current = null;
    };
  }, [option]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
