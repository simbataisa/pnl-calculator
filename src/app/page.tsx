"use client";

import React, { useEffect, useState } from "react";
import * as dfd from "danfojs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  cost: number;
  revenue: number;
  PnL?: number;
  YtdPnL?: number;
  YoyPnL?: number;
}

// Function to generate 2 years of daily cost and revenue data
const generateData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  const startDate = new Date(
    new Date().setFullYear(new Date().getFullYear() - 2)
  );
  const endDate = new Date();
  let currentDate = startDate;

  while (currentDate <= endDate) {
    data.push({
      date: currentDate.toISOString().split("T")[0],
      cost: Math.floor(Math.random() * 500) + 50, // Random cost between 50 and 550
      revenue: Math.floor(Math.random() * 1000) + 100, // Random revenue between 100 and 1100
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
};

const Home: React.FC = () => {
  const [ytdPnL, setYtdPnL] = useState<number>(0);
  const [yoyPnL, setYoyPnL] = useState<number>(0);
  const [chartData, setChartData] = useState<DataPoint[]>([]);

  useEffect(() => {
    const data = generateData();

    // Creating a DataFrame
    const df = new dfd.DataFrame(data);

    // Calculate PnL
    const PnL = df["revenue"].sub(df["cost"]);
    df.addColumn("PnL", PnL, { inplace: true });

    df.print();

    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    // Calculate YTD PnL
    const ytdData = df.loc({ rows: df["date"].dt.year().eq(currentYear) });
    const ytdPnL = ytdData["PnL"].sum() as number;
    setYtdPnL(ytdPnL);

    // Calculate YoY PnL
    const currentYearData = df.loc({
      rows: df["date"].dt.year().eq(currentYear),
    });
    const previousYearData = df.loc({
      rows: df["date"].dt.year().eq(previousYear),
    });

    const currentYearPnL = currentYearData["PnL"].sum() as number;
    const previousYearPnL = previousYearData["PnL"].sum() as number;

    const yoyPnL = currentYearPnL - previousYearPnL;
    setYoyPnL(yoyPnL);

    // Add YTD and YoY PnL to each data point for charting
    const updatedData = dfd.toJSON(df) as DataPoint[];
    const cumulativePnL = { ytd: 0, yoy: 0 };

    updatedData.forEach((item) => {
      const itemDate = new Date(item.date);
      if (itemDate.getFullYear() === currentYear) {
        cumulativePnL.ytd += item.PnL!;
        item.YtdPnL = cumulativePnL.ytd;
      }
      if (
        itemDate.getFullYear() === currentYear ||
        itemDate.getFullYear() === previousYear
      ) {
        cumulativePnL.yoy += item.PnL!;
        item.YoyPnL = cumulativePnL.yoy;
      }
    });

    console.log("updatedData", updatedData);
    setChartData(updatedData);
  }, []);

  return (
    <div>
      <h1>YTD PnL: {ytdPnL}</h1>
      <h1>YoY PnL: {yoyPnL}</h1>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="YtdPnL" stroke="#82ca9d" />
          <Line type="monotone" dataKey="YoyPnL" stroke="#ffc658" />
        </LineChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="PnL" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Home;
