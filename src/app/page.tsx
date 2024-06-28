"use client";

import React, {useEffect, useState} from "react";
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
    BarChart,
    Bar,
} from "recharts";
import PptxGenJS from "pptxgenjs";
import {Series, Str} from "danfojs";
import {App, Button, Col, ConfigProvider, Divider, Row, Space, theme, Typography} from "antd";

const style: React.CSSProperties = {background: '#0092ff', padding: '8px 0'};
const {Title, Paragraph, Text, Link} = Typography;


interface DataPoint {
    date: string;
    cost: number;
    revenue: number;
    PnL?: number;
    YtdPnL?: number;
    YoyPnL?: number;
}

interface MonthlyPnL {
    yearMonth: string;
    year: string;
    month: string;
    PnL: number;
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
    const [monthlyPnL, setMonthlyPnL] = useState<MonthlyPnL[]>([]);

    useEffect(() => {
        const data = generateData();

        // Creating a DataFrame
        const df = new dfd.DataFrame(data);

        // Convert the date column to datetime format
        dfd.toDateTime(df["date"]);

        // Calculate PnL
        const PnL = df["revenue"].sub(df["cost"]);
        df.addColumn("PnL", PnL, {inplace: true});

        df.print();

        const currentYear = new Date().getFullYear();
        const previousYear = currentYear - 1;

        // Calculate YTD PnL
        const ytdData = df.loc({rows: df["date"].dt.year().eq(currentYear)});
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
        const cumulativePnL = {ytd: 0, yoy: 0};

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

        setChartData(updatedData);

        // Extract year and month from the date column
        df.addColumn("year", df["date"].dt.year(), {inplace: true});
        df.addColumn("month", df["date"].dt.month(), {inplace: true});

        // Group by year and month and sum the PnL
        const grouped = df.groupby(["year", "month"]).agg({PnL: "sum"});

        const yearStr = new Str(grouped['year']);

        const monthYearSeries = yearStr.concat("-", 1).str.concat(grouped['month'].values, 1);
        console.log("month year series", monthYearSeries);
        grouped.addColumn("yearMonth", monthYearSeries, {inplace: true});

        grouped.print();

        const groupedJson = dfd.toJSON(grouped) as MonthlyPnL[];

        setMonthlyPnL(groupedJson);
    }, []);

    const exportToPptx = () => {
        const pptx = new PptxGenJS();
        const slide = pptx.addSlide();

        slide.addText("YTD PnL: " + ytdPnL, {x: 0.5, y: 0.5, fontSize: 18});
        slide.addText("YoY PnL: " + yoyPnL, {x: 0.5, y: 1, fontSize: 18});

        // Add chart image to the slide
        const chartElement = document.getElementById("chart");
        if (chartElement) {
            const svg = chartElement.querySelector("svg");
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx!.drawImage(img, 0, 0);
                    const imgData = canvas.toDataURL("image/png");
                    slide.addImage({data: imgData, x: 0.5, y: 1.5, w: 9, h: 5});
                    pptx
                        .writeFile({fileName: "PnL_Report"})
                        .then((r) => console.log("Done exporting pptx"));
                };
                img.src = "data:image/svg+xml;base64," + btoa(svgData);
            }
        }
    };

    // Function to convert data to JSON and trigger download
    const downloadJSON = (filename: string) => {
        const jsonLinesStr = chartData
            .map((item) => JSON.stringify(item))
            .join("\n");
        const blob = new Blob([jsonLinesStr], {type: "application/jsonl"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <ConfigProvider
                theme={{
                    // 1. Use dark algorithm
                    algorithm: theme.darkAlgorithm,

                    // 2. Combine dark algorithm and compact algorithm
                    // algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
                }}
            >
                    <Row justify={"center"}>
                        <Title>PNL Chart</Title>
                        <Row justify={"center"}>
                            <Col span={8}>
                                <Text> YTD PnL: {ytdPnL}</Text>
                            </Col>
                            <Col span={8}>
                                <Text>YoY PnL: {yoyPnL}</Text>
                            </Col>

                        </Row>
                        <Row>
                            <Col>

                                <Button onClick={exportToPptx}>Export to PPTX</Button>
                            </Col>
                            <Col>

                                <Button onClick={() => downloadJSON("data.jsonl")}>
                                    Download Chart Data
                                </Button>
                            </Col>
                        </Row>
                    </Row>
                    <Divider orientation="center">YTD & YoY PnL</Divider>
                    <Row justify="center">
                        <Col span={16}>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3"/>
                                    <XAxis dataKey="date"/>
                                    <YAxis/>
                                    <Tooltip/>
                                    <Legend/>
                                    <Line type="monotone" dataKey="YtdPnL" stroke="#82ca9d"/>
                                    <Line type="monotone" dataKey="YoyPnL" stroke="#ffc658"/>
                                </LineChart>
                            </ResponsiveContainer>
                        </Col>
                    </Row>
                    <Divider orientation="center">Daily PnL</Divider>
                    <Row justify="center">
                        <Col span={16}>
                            <ResponsiveContainer width="100%" height={400} id={"chart"}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3"/>
                                    <XAxis dataKey="date"/>
                                    <YAxis/>
                                    <Tooltip/>
                                    <Legend/>
                                    <Line type="monotone" dataKey="PnL" stroke="#8884d8"/>
                                </LineChart>
                            </ResponsiveContainer>
                        </Col>
                    </Row>

                    <Divider orientation="center">Monthly PNL</Divider>
                    <Row justify={"center"}>
                        <Col span={16}>
                            <ResponsiveContainer width="100%" height={400} id={"monthly-pnl"}>
                                <BarChart data={monthlyPnL}>
                                    <CartesianGrid strokeDasharray="3 3"/>
                                    <XAxis dataKey="yearMonth"/>
                                    <YAxis/>
                                    <Tooltip/>
                                    <Legend name={"Monthly PNL"}/>
                                    <Bar type="monotone" dataKey="PnL_sum" stroke="#8884d8"/>
                                </BarChart>
                            </ResponsiveContainer>
                        </Col>
                    </Row>

            </ConfigProvider>

        </div>
    );
};

export default Home;
